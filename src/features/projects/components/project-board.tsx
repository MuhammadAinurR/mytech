'use client'

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRight, Ellipsis, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SegmentedControl } from '@/components/ui/segmented'
import { toast } from '@/components/ui/toaster'
import { addDays } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ProjectItem } from '@/server/queries/projects'

import { deleteProjectAction, moveProjectAction } from '../actions'
import { applyMove, findColumn, formatDateRange, groupByStatus, type Columns } from '../lib/board'
import { projectProgress } from '../lib/progress'
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES, type ProjectStatus } from '../schema'
import { DatesDialog } from './dates-dialog'
import { ProgressLabel, ProgressTrack } from './progress-track'
import { useProjectDialog } from './project-dialog'

type Board = Columns<ProjectItem>
type PendingMove = {
  id: string
  name: string
  to: ProjectStatus
  index: number
  previous: Board
  notice?: string
}

const isColumn = (id: unknown): id is ProjectStatus =>
  PROJECT_STATUSES.includes(id as ProjectStatus)

/**
 * Phones show one column at a time; the hidden ones measure as zero-size
 * boxes at the corner of the screen. Only visible targets can take a drop.
 */
const visibleCollisions: CollisionDetection = (args) =>
  closestCorners({
    ...args,
    droppableContainers: args.droppableContainers.filter((container) => {
      const rect = args.droppableRects.get(container.id)
      return rect !== undefined && rect.width > 0
    }),
  })

const EMPTY_ON_PHONE: Record<ProjectStatus, string> = {
  todo: 'Nothing to do yet.',
  ongoing: 'Nothing in progress.',
  done: 'Nothing finished yet.',
}

/**
 * Kanban board. Drag with a mouse anywhere on a card, or from the keyboard
 * via the card's handle (Space/Enter to lift, arrows to move, Space/Enter to
 * drop, Escape to cancel). Every card also has a "Move to" menu, so changing
 * status never requires dragging. Moves are optimistic and roll back on error.
 *
 * Phones show one column at a time behind a segmented switch; a long press
 * lifts a card to reorder it, and its menu moves it to another column.
 */
export function ProjectBoard({ projects, today }: { projects: ProjectItem[]; today: string }) {
  const [columns, setColumns] = useState<Board>(() => groupByStatus(projects))
  const [source, setSource] = useState(projects)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [saving, startTransition] = useTransition()
  const [shown, setShown] = useState<ProjectStatus>('ongoing')
  if (source !== projects && activeId === null && pending === null && !saving) {
    // Fresh server data (after an action or a background refresh) replaces
    // local state, but never while a move is in progress: mid-drag, waiting
    // for dates, or saving. A render from before the move could otherwise
    // put the card back. The latest data is applied once the board is idle.
    setSource(projects)
    setColumns(groupByStatus(projects))
  }
  const [deleting, setDeleting] = useState<ProjectItem | null>(null)
  const before = useRef<Board | null>(null)
  // Stable ids keep dnd-kit's accessibility attributes identical on server and client.
  const dndId = useId()
  const { openCreate, openEdit } = useProjectDialog()

  // Left/Right jump straight to the neighbouring column (empty ones included,
  // which dnd-kit's default keyboard coordinates can't reach); Up/Down reorder.
  const columnsRef = useRef(columns)
  useEffect(() => {
    columnsRef.current = columns
  }, [columns])
  const coordinateGetter = useCallback<KeyboardCoordinateGetter>((event, args) => {
    const { active, collisionRect, droppableRects } = args.context
    if ((event.code === 'ArrowRight' || event.code === 'ArrowLeft') && active && collisionRect) {
      event.preventDefault()
      const from = findColumn(columnsRef.current, String(active.id))
      const target = from
        ? PROJECT_STATUSES[PROJECT_STATUSES.indexOf(from) + (event.code === 'ArrowRight' ? 1 : -1)]
        : undefined
      // Rects are measured asynchronously after lifting; fall back to the DOM so a
      // quick arrow press right after Space still lands in the next column.
      const rect =
        (target ? droppableRects.get(target) : undefined) ??
        (target
          ? document.querySelector(`[data-column="${target}"]`)?.getBoundingClientRect()
          : undefined)
      if (!rect) return undefined
      return { x: rect.left + (rect.width - collisionRect.width) / 2, y: rect.top + 8 }
    }
    return sortableKeyboardCoordinates(event, args)
  }, [])

  const sensors = useSensors(
    // A mouse lifts after a few pixels; a finger after a long press, so a
    // swipe over the cards still scrolls the page.
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  )

  const all = PROJECT_STATUSES.flatMap((status) => columns[status])
  const byId = (id: unknown) => all.find((project) => project.id === id)
  const nameOf = (id: unknown) => byId(id)?.name ?? 'Project'

  function persist(
    id: string,
    to: ProjectStatus,
    index: number,
    previous: Board,
    dates?: { startDate: string; endDate: string },
    notice?: string,
  ) {
    const card = byId(id)
    const from = findColumn(previous, id)
    const fromIndex = from ? previous[from].findIndex((p) => p.id === id) : -1
    if (from === to && fromIndex === index && !dates) return

    if (to === 'ongoing' && !dates && (!card?.startDate || !card?.endDate)) {
      setPending({ id, name: card?.name ?? 'Project', to, index, previous, notice })
      return
    }

    startTransition(async () => {
      const result = await moveProjectAction({ id, status: to, index, ...dates })
      if (!result.ok) {
        setColumns(previous)
        toast.error(
          result.error === 'not_found'
            ? 'That project no longer exists.'
            : 'That move didn’t save.',
        )
      } else if (notice) {
        toast.success(notice)
      }
    })
  }

  function moveTo(id: string, to: ProjectStatus) {
    const previous = columns
    const index = columns[to].length
    setColumns(applyMove(columns, id, to, index))
    // On a phone the card leaves the column on screen, so say where it went.
    persist(id, to, index, previous, undefined, `Moved to ${PROJECT_STATUS_LABELS[to]}`)
  }

  function onDragStart({ active, activatorEvent }: DragStartEvent) {
    before.current = columns
    setActiveId(String(active.id))
    // A tick when a long press lifts the card (Android; iOS has no vibrate).
    if ('touches' in activatorEvent && 'vibrate' in navigator) navigator.vibrate(8)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = findColumn(columns, String(active.id))
    const to = isColumn(over.id) ? over.id : findColumn(columns, String(over.id))
    if (!from || !to || from === to) return
    const overIndex = isColumn(over.id)
      ? columns[to].length
      : columns[to].findIndex((p) => p.id === over.id)
    setColumns(
      applyMove(columns, String(active.id), to, overIndex < 0 ? columns[to].length : overIndex),
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    const previous = before.current ?? columns
    before.current = null
    if (!over) return setColumns(previous)

    const id = String(active.id)
    const to = findColumn(columns, id)
    if (!to) return setColumns(previous)
    const overIndex = isColumn(over.id) ? -1 : columns[to].findIndex((p) => p.id === over.id)
    const index = overIndex >= 0 ? overIndex : columns[to].findIndex((p) => p.id === id)
    const next = applyMove(columns, id, to, index)
    setColumns(next)
    persist(
      id,
      to,
      next[to].findIndex((p) => p.id === id),
      previous,
    )
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${nameOf(active.id)} is no longer over a column.`
      const column = isColumn(over.id) ? over.id : findColumn(columns, String(over.id))
      return column ? `${nameOf(active.id)} is over ${PROJECT_STATUS_LABELS[column]}.` : undefined
    },
    onDragEnd: ({ active, over }) => {
      const column = over
        ? isColumn(over.id)
          ? over.id
          : findColumn(columns, String(over.id))
        : null
      return column
        ? `${nameOf(active.id)} dropped in ${PROJECT_STATUS_LABELS[column]}.`
        : `${nameOf(active.id)} returned to where it was.`
    },
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  }

  const activeCard = activeId ? byId(activeId) : undefined
  return (
    <>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={visibleCollisions}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          if (before.current) setColumns(before.current)
          before.current = null
        }}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'To move a project, press Space or Enter on its handle, use the arrow keys to move it, then Space or Enter to drop it. Press Escape to cancel. The card menu also has Move to options.',
          },
        }}
      >
        <div className="px-4 pb-4 md:hidden">
          <SegmentedControl
            label="Column"
            value={shown}
            onValueChange={setShown}
            className="grid w-full auto-cols-fr grid-flow-col"
            itemClassName="h-8 justify-center"
            options={PROJECT_STATUSES.map((status) => ({
              value: status,
              label: (
                <>
                  {PROJECT_STATUS_LABELS[status]}{' '}
                  <span className="tabular text-subtle">{columns[status].length}</span>
                </>
              ),
            }))}
          />
        </div>
        <div data-grouped className="grid gap-4 px-(--gutter) pb-10 max-md:px-4 md:grid-cols-3">
          {PROJECT_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              count={columns[status].length}
              shownOnPhone={status === shown}
              onAdd={() => openCreate(status)}
            >
              <SortableContext
                items={columns[status].map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {columns[status].map((project) => (
                  <SortableCard
                    key={project.id}
                    project={project}
                    today={today}
                    onEdit={() => openEdit(project)}
                    onMove={(to) => moveTo(project.id, to)}
                    onDelete={() => setDeleting(project)}
                  />
                ))}
              </SortableContext>
            </Column>
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          {activeCard ? (
            <CardBody
              project={activeCard}
              today={today}
              className="shadow-drag max-md:scale-[1.02]"
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <DatesDialog
        key={pending?.id ?? 'none'}
        projectName={pending?.name ?? null}
        defaults={{ startDate: today, endDate: addDays(today, 14) }}
        onCancel={() => {
          if (pending) setColumns(pending.previous)
          setPending(null)
        }}
        onConfirm={(dates) => {
          if (!pending) return
          setColumns((current) => ({
            ...current,
            ongoing: current.ongoing.map((p) => (p.id === pending.id ? { ...p, ...dates } : p)),
          }))
          persist(pending.id, pending.to, pending.index, pending.previous, dates, pending.notice)
          setPending(null)
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? null : setDeleting(null))}
        title={`Delete “${deleting?.name ?? ''}”?`}
        description="It will be removed from the board and calendar."
        confirmLabel="Delete project"
        onConfirm={async () => {
          if (!deleting) return
          const result = await deleteProjectAction(deleting.id)
          if (result.ok) toast.success('Project deleted')
          else toast.error('That project no longer exists.')
        }}
      />
    </>
  )
}

function Column({
  status,
  count,
  shownOnPhone,
  onAdd,
  children,
}: {
  status: ProjectStatus
  count: number
  shownOnPhone: boolean
  onAdd: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section
      aria-labelledby={`column-${status}`}
      className={cn('flex min-w-0 flex-col gap-2', !shownOnPhone && 'max-md:hidden')}
    >
      {/* Phones name the column in the segmented switch instead. */}
      <header className="flex h-8 items-center justify-between pl-1 max-md:hidden">
        <h2 id={`column-${status}`} className="flex items-center gap-2 text-sm font-medium">
          {PROJECT_STATUS_LABELS[status]}
          <span className="tabular text-subtle">{count}</span>
        </h2>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Add to ${PROJECT_STATUS_LABELS[status]}`}
          onClick={onAdd}
        >
          <Plus />
        </Button>
      </header>
      <div
        ref={setNodeRef}
        data-column={status}
        className={cn(
          'flex min-h-32 flex-col gap-2 rounded-md bg-background p-2 transition-colors duration-150',
          isOver && 'bg-fill',
          'max-md:min-h-0 max-md:gap-2.5 max-md:bg-transparent max-md:p-0',
        )}
      >
        {children}
        {count === 0 ? (
          <>
            <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-sm text-subtle max-md:hidden">
              {status === 'ongoing' ? 'Drag a project here to start it.' : 'Nothing here yet.'}
            </p>
            <div className="flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-10 text-center md:hidden">
              <p className="text-md text-muted">{EMPTY_ON_PHONE[status]}</p>
              <Button size="md" onClick={onAdd}>
                <Plus />
                New project
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

function SortableCard({
  project,
  today,
  onEdit,
  onMove,
  onDelete,
}: {
  project: ProjectItem
  today: string
  onEdit: () => void
  onMove: (to: ProjectStatus) => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })
  const { onMouseDown, onTouchStart, onKeyDown } = (listeners ?? {}) as {
    onMouseDown?: React.MouseEventHandler
    onTouchStart?: React.TouchEventHandler
    onKeyDown?: React.KeyboardEventHandler
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      // No text selection or callout from the long press that lifts a card.
      className={cn(
        'touch-manipulation max-md:select-none max-md:[-webkit-touch-callout:none]',
        isDragging && 'opacity-40',
      )}
    >
      <CardBody
        project={project}
        today={today}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            onKeyDown={onKeyDown}
            aria-label={`Move ${project.name}`}
            className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-xs text-subtle opacity-0 transition-opacity duration-150 group-hover/card:opacity-100 focus-visible:opacity-100 active:cursor-grabbing max-md:hidden pointer-coarse:opacity-100"
          >
            <GripVertical className="size-4" />
          </button>
        }
        title={
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer text-left font-medium hover:underline"
          >
            {project.name}
          </button>
        }
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Actions for ${project.name}`}
                className="opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {PROJECT_STATUSES.filter((status) => status !== project.status).map((status) => (
                <DropdownMenuItem key={status} onSelect={() => onMove(status)}>
                  <ArrowRight />
                  {PROJECT_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger" onSelect={onDelete}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    </div>
  )
}

function CardBody({
  project,
  today,
  handle,
  title,
  menu,
  className,
}: {
  project: ProjectItem
  today: string
  handle?: React.ReactNode
  title?: React.ReactNode
  menu?: React.ReactNode
  className?: string
}) {
  const year = today.slice(0, 4)
  // Phones show how far through its dates an ongoing project is.
  const progress =
    project.status === 'ongoing' && project.startDate && project.endDate
      ? projectProgress(project.startDate, project.endDate, today)
      : null
  return (
    <article
      className={cn(
        'group/card flex flex-col gap-1.5 rounded-sm border border-border bg-surface p-3 text-sm transition-colors duration-150 hover:border-border-strong',
        'max-md:gap-1 max-md:rounded-lg max-md:border-0 max-md:p-4',
        className,
      )}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1 pt-0.5 max-md:text-md">
          {title ?? <span className="font-medium">{project.name}</span>}
        </div>
        <div className="-mt-1 -mr-1 flex items-center">
          {handle}
          {menu}
        </div>
      </div>
      {project.startDate && project.endDate ? (
        <p className="tabular text-xs text-muted max-md:text-sm">
          {formatDateRange(project.startDate, project.endDate, year)}
          {progress ? (
            <span className="md:hidden">
              {' · '}
              <ProgressLabel progress={progress} />
            </span>
          ) : null}
        </p>
      ) : project.startDate ? (
        <p className="tabular text-xs text-muted max-md:text-sm">
          From {formatDateRange(project.startDate, project.startDate, year)}
        </p>
      ) : null}
      {project.description ? (
        <p className="line-clamp-2 text-xs text-muted max-md:text-sm">{project.description}</p>
      ) : null}
      {progress ? <ProgressTrack progress={progress} className="mt-2.5 md:hidden" /> : null}
    </article>
  )
}

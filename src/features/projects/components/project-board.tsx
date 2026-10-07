'use client'

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
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
import { toast } from '@/components/ui/toaster'
import { addDays } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ProjectItem } from '@/server/queries/projects'

import { deleteProjectAction, moveProjectAction } from '../actions'
import { applyMove, findColumn, formatDateRange, groupByStatus, type Columns } from '../lib/board'
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES, type ProjectStatus } from '../schema'
import { DatesDialog } from './dates-dialog'
import { useProjectDialog } from './project-dialog'

type Board = Columns<ProjectItem>
type PendingMove = { id: string; name: string; to: ProjectStatus; index: number; previous: Board }

const isColumn = (id: unknown): id is ProjectStatus =>
  PROJECT_STATUSES.includes(id as ProjectStatus)

/**
 * Kanban board. Drag with a pointer anywhere on a card, or from the keyboard
 * via the card's handle (Space/Enter to lift, arrows to move, Space/Enter to
 * drop, Escape to cancel). Every card also has a "Move to" menu, so changing
 * status never requires dragging. Moves are optimistic and roll back on error.
 */
export function ProjectBoard({ projects, today }: { projects: ProjectItem[]; today: string }) {
  const [columns, setColumns] = useState<Board>(() => groupByStatus(projects))
  const [source, setSource] = useState(projects)
  if (source !== projects) {
    // Fresh server data (after any action) replaces local state.
    setSource(projects)
    setColumns(groupByStatus(projects))
  }
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [deleting, setDeleting] = useState<ProjectItem | null>(null)
  const [, startTransition] = useTransition()
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
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
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
  ) {
    const card = byId(id)
    const from = findColumn(previous, id)
    const fromIndex = from ? previous[from].findIndex((p) => p.id === id) : -1
    if (from === to && fromIndex === index && !dates) return

    if (to === 'ongoing' && !dates && (!card?.startDate || !card?.endDate)) {
      setPending({ id, name: card?.name ?? 'Project', to, index, previous })
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
      }
    })
  }

  function moveTo(id: string, to: ProjectStatus) {
    const previous = columns
    const index = columns[to].length
    setColumns(applyMove(columns, id, to, index))
    persist(id, to, index, previous)
  }

  function onDragStart({ active }: DragStartEvent) {
    before.current = columns
    setActiveId(String(active.id))
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
  const year = today.slice(0, 4)

  return (
    <>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCorners}
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
        <div className="grid gap-4 px-(--gutter) pb-10 md:grid-cols-3">
          {PROJECT_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              count={columns[status].length}
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
                    year={year}
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
            <CardBody project={activeCard} year={year} className="shadow-drag" />
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
          persist(pending.id, pending.to, pending.index, pending.previous, dates)
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
  onAdd,
  children,
}: {
  status: ProjectStatus
  count: number
  onAdd: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section aria-labelledby={`column-${status}`} className="flex min-w-0 flex-col gap-2">
      <header className="flex h-8 items-center justify-between pl-1">
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
        )}
      >
        {children}
        {count === 0 ? (
          <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-sm text-subtle">
            {status === 'ongoing' ? 'Drag a project here to start it.' : 'Nothing here yet.'}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function SortableCard({
  project,
  year,
  onEdit,
  onMove,
  onDelete,
}: {
  project: ProjectItem
  year: string
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
  const { onPointerDown, onKeyDown } = (listeners ?? {}) as {
    onPointerDown?: React.PointerEventHandler
    onKeyDown?: React.KeyboardEventHandler
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onPointerDown={onPointerDown}
      className={cn('touch-manipulation', isDragging && 'opacity-40')}
    >
      <CardBody
        project={project}
        year={year}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            onKeyDown={onKeyDown}
            aria-label={`Move ${project.name}`}
            className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-xs text-subtle opacity-0 transition-opacity duration-150 group-hover/card:opacity-100 focus-visible:opacity-100 active:cursor-grabbing pointer-coarse:opacity-100"
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
  year,
  handle,
  title,
  menu,
  className,
}: {
  project: ProjectItem
  year: string
  handle?: React.ReactNode
  title?: React.ReactNode
  menu?: React.ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'group/card flex flex-col gap-1.5 rounded-sm border border-border bg-surface p-3 text-sm transition-colors duration-150 hover:border-border-strong',
        className,
      )}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1 pt-0.5">
          {title ?? <span className="font-medium">{project.name}</span>}
        </div>
        <div className="-mt-1 -mr-1 flex items-center">
          {handle}
          {menu}
        </div>
      </div>
      {project.startDate && project.endDate ? (
        <p className="tabular text-xs text-muted">
          {formatDateRange(project.startDate, project.endDate, year)}
        </p>
      ) : project.startDate ? (
        <p className="tabular text-xs text-muted">
          From {formatDateRange(project.startDate, project.startDate, year)}
        </p>
      ) : null}
      {project.description ? (
        <p className="line-clamp-2 text-xs text-muted">{project.description}</p>
      ) : null}
    </article>
  )
}

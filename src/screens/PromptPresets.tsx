import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './PromptPresets.css'

import {
    getAllPreferences,
    createPreference,
    updatePreference,
    deletePreference,
    getPreferenceImages,
    getErrorMessage,
    PreferenceItem,
    PreferenceCategory,
    PreferenceImage,
} from '../api/preferences'

import ImageModal from '../components/ImageModal'
import { getLocalImageUrl } from '../utils/localImage'

import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import DeleteOutlineIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import StyleIcon from '@mui/icons-material/Style'
import PaletteIcon from '@mui/icons-material/Palette'
import LandscapeIcon from '@mui/icons-material/Landscape'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

/* -------------------------------------------------------------------------- */
/* Types and constants                                                        */
/* -------------------------------------------------------------------------- */

type Draft = {
    name: string
    positive: string
    negative: string
}

type CategoryMeta = {
    value: PreferenceCategory
    label: string
    singular: string
    Icon: typeof StyleIcon
    what: string
    tip: string
    example: string
    negativeExample: string
}

type ToastKind = 'success' | 'info' | 'error'

type Toast = {
    id: number
    kind: ToastKind
    message: string
    action?: { label: string; onClick: () => void }
}

const META: Record<PreferenceCategory, CategoryMeta> = {
    STYLE: {
        value: 'STYLE',
        label: 'Styles',
        singular: 'style',
        Icon: StyleIcon,
        what: 'A style controls how the image looks: the medium and visual finish, like oil painting, anime or 3D render. Its prompt is added to your main idea every time you generate.',
        tip: 'Use short keywords separated by commas, and describe the look only, not the scene.',
        example: 'oil painting, thick brush strokes, rich textures',
        negativeExample: 'photograph, digital look, flat colors',
    },
    THEME: {
        value: 'THEME',
        label: 'Themes',
        singular: 'theme',
        Icon: PaletteIcon,
        what: 'A theme sets the world and mood of the scene: its setting, atmosphere and colors, like cyberpunk, fantasy or cozy autumn. Its prompt is added to your main idea every time you generate.',
        tip: 'Describe the setting and atmosphere with keywords, like places, lighting and colors.',
        example: 'neon lights, rainy futuristic city, glowing signs',
        negativeExample: 'daylight, countryside, medieval',
    },
    COMPOSITION: {
        value: 'COMPOSITION',
        label: 'Compositions',
        singular: 'composition',
        Icon: LandscapeIcon,
        what: 'A composition controls how the scene is framed: camera angle, distance and layout, like a wide shot, a close-up or a symmetrical view. Its prompt is added to your main idea every time you generate.',
        tip: 'Describe the camera and layout with keywords, like angle, distance and where things sit.',
        example: 'wide angle shot, centered subject, rule of thirds',
        negativeExample: 'close-up, cropped subject, tilted horizon',
    },
}

const CATEGORIES = [META.STYLE, META.THEME, META.COMPOSITION]

const EMPTY_DRAFT: Draft = { name: '', positive: '', negative: '' }

const MAX_NAME_LENGTH = 50
const MAX_PROMPT_LENGTH = 400

const TOAST_MS = 4000
const UNDO_TOAST_MS = 6000
const SAVED_FLASH_MS = 1800
const ROW_FLASH_MS = 1600

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const sortByName = (list: PreferenceItem[]) =>
    [...list].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))

const draftFromItem = (item: PreferenceItem): Draft => ({
    name: item.name,
    positive: item.positive_prompt_tags,
    negative: item.negative_prompt_tags,
})

const firstOfCategory = (list: PreferenceItem[], category: PreferenceCategory) =>
    sortByName(list.filter((item) => item.category === category))[0]

/* -------------------------------------------------------------------------- */
/* PromptBox: one prompt textarea (positive or negative)                      */
/* -------------------------------------------------------------------------- */

type PromptBoxProps = {
    variant: 'positive' | 'negative'
    title: string
    hint: string
    value: string
    placeholder: string
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
}

function PromptBox({ variant, title, hint, value, placeholder, onChange }: PromptBoxProps) {
    return (
        <div className={`presets-prompt-box ${variant}`}>
            <div className="presets-prompt-head">
                <h3 className="presets-prompt-title">
                    <span className="presets-prompt-dot" />
                    {title}
                </h3>
                <span className="presets-prompt-count">
                    {value.length} / {MAX_PROMPT_LENGTH}
                </span>
            </div>
            <textarea
                className="presets-textarea"
                value={value}
                maxLength={MAX_PROMPT_LENGTH}
                placeholder={placeholder}
                onChange={onChange}
            />
            <p className="presets-prompt-hint">{hint}</p>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* ReferenceImages: carousel of images generated with the open preset         */
/* -------------------------------------------------------------------------- */

type ReferenceImagesProps = {
    preset: PreferenceItem
    meta: CategoryMeta
}

function ReferenceImages({ preset, meta }: ReferenceImagesProps) {
    const [images, setImages] = useState<PreferenceImage[]>([])
    const [loading, setLoading] = useState(true)
    const [failed, setFailed] = useState(false)
    const [canScroll, setCanScroll] = useState({ left: false, right: false })

    const [activeImage, setActiveImage] = useState<PreferenceImage | null>(null)

    const trackRef = useRef<HTMLDivElement | null>(null)

    const updateArrows = () => {
        const track = trackRef.current
        if (!track) return

        setCanScroll({
            left: track.scrollLeft > 4,
            right: track.scrollLeft + track.clientWidth < track.scrollWidth - 4,
        })
    }

    const scrollTrack = (direction: 1 | -1) => {
        const track = trackRef.current
        if (!track) return

        track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' })
    }

    // refetch whenever another preset is opened
    useEffect(() => {
        let cancelled = false

        setLoading(true)
        setFailed(false)
        setImages([])

        getPreferenceImages(preset.id)
            .then((response) => {
                if (!cancelled) setImages(response.data)
            })
            .catch((err) => {
                console.error('Failed to load reference images:', err)
                if (!cancelled) setFailed(true)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
    }, [preset.id])

    // arrows depend on the rendered width, so recheck after images change
    useEffect(() => {
        trackRef.current?.scrollTo({ left: 0 })
        updateArrows()
    }, [images])

    return (
        <section className="presets-gallery">
            <h3 className="presets-gallery-title">
                Made with this {meta.singular}
                {images.length > 0 && <span className="presets-gallery-count">{images.length}</span>}
            </h3>

            {loading && <div className="presets-gallery-message">Loading images...</div>}

            {!loading && failed && (
                <div className="presets-gallery-message presets-gallery-error">
                    Could not load the images.
                </div>
            )}

            {!loading && !failed && images.length === 0 && (
                <div className="presets-gallery-message">
                    Nothing yet. Images you generate with this {meta.singular} will show up here.
                </div>
            )}

            {images.length > 0 && (
                <div className="presets-carousel">
                    <button
                        className="presets-carousel-btn left"
                        onClick={() => scrollTrack(-1)}
                        disabled={!canScroll.left}
                        aria-label="Scroll images left"
                    >
                        <ChevronLeftIcon />
                    </button>

                    <div className="presets-carousel-track" ref={trackRef} onScroll={updateArrows}>
                        {images.map((image) => (
                            <button
                                key={image.id}
                                type="button"
                                className="presets-carousel-item"
                                onClick={() => setActiveImage(image)}
                            >
                                <img
                                    src={getLocalImageUrl(image.image_path)}
                                    alt={`Generated with ${preset.name}`}
                                    loading="lazy"
                                    onLoad={updateArrows}
                                />
                            </button>
                        ))}
                    </div>

                    <button
                        className="presets-carousel-btn right"
                        onClick={() => scrollTrack(1)}
                        disabled={!canScroll.right}
                        aria-label="Scroll images right"
                    >
                        <ChevronRightIcon />
                    </button>
                </div>
            )}

            {activeImage && (
                <ImageModal
                    src={getLocalImageUrl(activeImage.image_path)}
                    onClose={() => setActiveImage(null)}
                />
            )}
        </section>
    )
}

/* -------------------------------------------------------------------------- */
/* PromptPresets screen                                                       */
/* -------------------------------------------------------------------------- */

export default function PromptPresets() {

    const [items, setItems] = useState<PreferenceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [activeCategory, setActiveCategory] = useState<PreferenceCategory>('STYLE')
    const [search, setSearch] = useState('')

    // an existing preset is open (selectedId) or a new one is being written (isCreating)
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)

    const [saving, setSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [helpOpen, setHelpOpen] = useState(false)

    // delete asks for a yes / no first, like the model cards do
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // feedback: one toast at a time, plus a brief highlight on the row that changed
    const [toast, setToast] = useState<Toast | null>(null)
    const [flashId, setFlashId] = useState<number | null>(null)

    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const listRef = useRef<HTMLDivElement | null>(null)
    const nameInputRef = useRef<HTMLInputElement | null>(null)
    const [focusNameTick, setFocusNameTick] = useState(0)

    /* ---------------------------------------------------------------- derived */

    const activeMeta = META[activeCategory]
    const activeIndex = CATEGORIES.findIndex((category) => category.value === activeCategory)

    const categoryItems = useMemo(
        () => sortByName(items.filter((item) => item.category === activeCategory)),
        [items, activeCategory]
    )

    const visibleItems = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return categoryItems

        return categoryItems.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                item.positive_prompt_tags.toLowerCase().includes(query)
        )
    }, [categoryItems, search])

    const selected = items.find((item) => item.id === selectedId) ?? null
    const showEditor = isCreating || !!selected

    const isDirty = isCreating
        ? draft.name !== '' || draft.positive !== '' || draft.negative !== ''
        : !!selected && (
            draft.name !== selected.name ||
            draft.positive !== selected.positive_prompt_tags ||
            draft.negative !== selected.negative_prompt_tags
        )

    const canSave =
        isDirty && !saving && draft.name.trim() !== '' && draft.positive.trim() !== ''

    // tells the person why Save is disabled instead of leaving them guessing
    const saveHint = (() => {
        if (!isDirty || saving) return null

        const noName = draft.name.trim() === ''
        const noPositive = draft.positive.trim() === ''

        if (noName && noPositive) return 'Add a name and a positive prompt to save.'
        if (noName) return 'Give it a name to save.'
        if (noPositive) return 'Add a positive prompt to save.'
        return null
    })()

    /* --------------------------------------------------------------- feedback */

    const showToast = (
        kind: ToastKind,
        message: string,
        action?: Toast['action'],
        duration: number = TOAST_MS
    ) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)

        setToast({ id: Date.now(), kind, message, action })
        toastTimerRef.current = setTimeout(() => setToast(null), duration)
    }

    const dismissToast = () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast(null)
    }

    const markSaved = (id: number) => {
        setJustSaved(true)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setJustSaved(false), SAVED_FLASH_MS)

        setFlashId(id)
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setFlashId(null), ROW_FLASH_MS)
    }

    /* ------------------------------------------------------- open / close presets */

    const openItem = (item: PreferenceItem) => {
        setConfirmingDelete(false)
        setIsCreating(false)
        setSelectedId(item.id)
        setDraft(draftFromItem(item))
        setError(null)
        setJustSaved(false)
    }

    const openNewDraft = (initial: Draft) => {
        setConfirmingDelete(false)
        setIsCreating(true)
        setSelectedId(null)
        setDraft(initial)
        setError(null)
        setJustSaved(false)
        setFocusNameTick((tick) => tick + 1)
    }

    const clearEditor = () => {
        setConfirmingDelete(false)
        setIsCreating(false)
        setSelectedId(null)
        setDraft(EMPTY_DRAFT)
        setError(null)
        setJustSaved(false)
    }

    const openFirstOrClear = (list: PreferenceItem[]) => {
        if (list[0]) openItem(list[0])
        else clearEditor()
    }

    const confirmDiscard = () =>
        !isDirty || window.confirm('Discard your unsaved changes?')

    const updateDraft = (field: keyof Draft) =>
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setDraft((prev) => ({ ...prev, [field]: event.target.value }))

    /* ------------------------------------------------------------------ handlers */

    const handleSelect = (item: PreferenceItem) => {
        if (item.id === selectedId && !isCreating) return
        if (!confirmDiscard()) return

        openItem(item)
    }

    const handleCategoryChange = (category: PreferenceCategory) => {
        if (category === activeCategory) return
        if (!confirmDiscard()) return

        setActiveCategory(category)
        setSearch('')
        setHelpOpen(false)

        const first = firstOfCategory(items, category)
        if (first) openItem(first)
        else clearEditor()
    }

    const handleNew = () => {
        if (!confirmDiscard()) return
        openNewDraft(EMPTY_DRAFT)
    }

    const handleCancelNew = () => {
        if (!confirmDiscard()) return
        openFirstOrClear(categoryItems)
    }

    const handleRevert = () => {
        if (selected) openItem(selected)
    }

    const handleDuplicate = () => {
        if (!selected) return
        if (!confirmDiscard()) return

        openNewDraft({
            ...draftFromItem(selected),
            name: `${selected.name} copy`.slice(0, MAX_NAME_LENGTH),
        })

        showToast('info', `Copy of "${selected.name}" is ready. Rename it, then create it.`)
    }

    const handleSave = async () => {
        if (!canSave) return

        setSaving(true)
        setError(null)

        const data = {
            name: draft.name,
            positive_prompt_tags: draft.positive,
            negative_prompt_tags: draft.negative,
        }

        try {
            if (isCreating) {
                const response = await createPreference({ ...data, category: activeCategory })
                setItems((prev) => [...prev, response.data])
                openItem(response.data)
                markSaved(response.data.id)
                showToast('success', `Created ${activeMeta.singular} "${response.data.name}"`)
            } else if (selected) {
                const response = await updatePreference(selected.id, data)
                setItems((prev) => prev.map((item) => item.id === selected.id ? response.data : item))
                openItem(response.data)
                markSaved(response.data.id)
                showToast('success', `Saved "${response.data.name}"`)
            }
        } catch (err) {
            setError(getErrorMessage(err))
            showToast('error', "Couldn't save. Check the message below and try again.")
        } finally {
            setSaving(false)
        }
    }

    const handleUndo = async (item: PreferenceItem) => {
        dismissToast()

        try {
            // the restored preset gets a new id, nothing else depends on the old one
            const response = await createPreference({
                category: item.category,
                name: item.name,
                positive_prompt_tags: item.positive_prompt_tags,
                negative_prompt_tags: item.negative_prompt_tags,
            })

            setItems((prev) => [...prev, response.data])
            setActiveCategory(response.data.category)
            setSearch('')
            openItem(response.data)
            markSaved(response.data.id)
            showToast('success', `Restored "${response.data.name}"`)
        } catch (err) {
            showToast('error', `Couldn't restore "${item.name}". ${getErrorMessage(err)}`)
        }
    }

    const handleDelete = async () => {
        if (!selected || isDeleting) return

        const deleted = selected

        setIsDeleting(true)

        try {
            await deletePreference(deleted.id)
        } catch (err) {
            showToast('error', `Couldn't delete "${deleted.name}". ${getErrorMessage(err)}`)
            setIsDeleting(false)
            setConfirmingDelete(false)
            return
        }

        const remaining = categoryItems.filter((item) => item.id !== deleted.id)

        setItems((prev) => prev.filter((item) => item.id !== deleted.id))
        openFirstOrClear(remaining)
        setIsDeleting(false)

        showToast(
            'success',
            `Deleted "${deleted.name}"`,
            { label: 'Undo', onClick: () => handleUndo(deleted) },
            UNDO_TOAST_MS
        )
    }

    /* ------------------------------------------------------------------- effects */

    useEffect(() => {
        const loadItems = async () => {
            try {
                const response = await getAllPreferences()
                setItems(response.data)

                const first = firstOfCategory(response.data, 'STYLE')
                if (first) openItem(first)
            } catch (err) {
                console.error('Failed to load prompt presets:', err)
                setLoadError('Could not load your prompt presets.')
            } finally {
                setLoading(false)
            }
        }

        loadItems()

        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
        }
    }, [])

    // new / duplicated drafts jump straight to the name field
    useEffect(() => {
        if (focusNameTick === 0) return
        nameInputRef.current?.focus()
        nameInputRef.current?.select()
    }, [focusNameTick])

    // keep the open row in view (e.g. right after create or undo)
    useEffect(() => {
        if (selectedId === null) return

        listRef.current
            ?.querySelector(`[data-id="${selectedId}"]`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [selectedId, items.length, activeCategory])

    useEffect(() => {
        if (!confirmingDelete) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isDeleting) setConfirmingDelete(false)
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [confirmingDelete, isDeleting])

    // Ctrl/Cmd + S saves; the ref always points at the latest handler
    const saveRef = useRef(handleSave)
    saveRef.current = handleSave

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                saveRef.current()
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    /* -------------------------------------------------------------------- render */

    const showSavedState = justSaved && !isDirty && !saving

    return (
        <div className="presets-screen">
            <div className="presets-body">

                {/* ---------------------------------------------------- left pane */}
                <div className="presets-list-pane">
                    <h1 className="presets-title">Prompt Presets</h1>

                    <div
                        className="presets-tabs"
                        role="tablist"
                        style={{ '--i': activeIndex } as React.CSSProperties}
                    >
                        <span className="presets-tabs-pill" />
                        {CATEGORIES.map((category) => (
                            <button
                                key={category.value}
                                role="tab"
                                aria-selected={category.value === activeCategory}
                                className={`presets-tab ${category.value === activeCategory ? 'active' : ''}`}
                                onClick={() => handleCategoryChange(category.value)}
                            >
                                <category.Icon fontSize="small" />
                                <span>{category.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="presets-search">
                        <SearchIcon fontSize="small" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={
                                categoryItems.length > 0
                                    ? `Search ${categoryItems.length} ${activeMeta.label.toLowerCase()}`
                                    : `Search ${activeMeta.label.toLowerCase()}`
                            }
                        />
                    </div>

                    <div className="presets-list" ref={listRef}>
                        {loading && (
                            <>
                                <div className="presets-skeleton" />
                                <div className="presets-skeleton" />
                                <div className="presets-skeleton" />
                                <div className="presets-skeleton" />
                            </>
                        )}

                        {!loading && loadError && (
                            <div className="presets-list-message presets-list-error">{loadError}</div>
                        )}

                        {/* the unsaved new / duplicated preset shows up in the list right away */}
                        {isCreating && (
                            <div className="presets-row draft selected" aria-current="true">
                                <span className="presets-row-name">
                                    {draft.name.trim() || `New ${activeMeta.singular}`}
                                </span>
                                <span className="presets-row-tag">Unsaved</span>
                            </div>
                        )}

                        {!loading && !loadError && categoryItems.length === 0 && !isCreating && (
                            <div className="presets-list-message">
                                No {activeMeta.label.toLowerCase()} yet.
                            </div>
                        )}

                        {!loading && categoryItems.length > 0 && visibleItems.length === 0 && (
                            <div className="presets-list-message">No matches.</div>
                        )}

                        {visibleItems.map((item) => (
                            <button
                                key={item.id}
                                data-id={item.id}
                                className={[
                                    'presets-row',
                                    item.id === selectedId && !isCreating ? 'selected' : '',
                                    item.id === flashId ? 'flash' : '',
                                ].filter(Boolean).join(' ')}
                                onClick={() => handleSelect(item)}
                            >
                                <span className="presets-row-name">{item.name}</span>
                            </button>
                        ))}
                    </div>

                    <button className="presets-new-btn" onClick={handleNew} disabled={loading}>
                        <AddIcon fontSize="small" />
                        New {activeMeta.singular}
                    </button>
                </div>

                {/* --------------------------------------------------- right pane */}
                <div className="presets-editor-pane">
                    {showEditor ? (
                        <>
                            <div className="presets-editor-scroll">
                                <div className="presets-editor-body" key={isCreating ? 'new' : selectedId}>

                                    <div className="presets-editor-header">
                                        <div className="presets-editor-heading">
                                            <span className="presets-eyebrow">
                                                <activeMeta.Icon sx={{ fontSize: 14 }} />
                                                {isCreating ? `New ${activeMeta.singular}` : activeMeta.singular}
                                            </span>
                                            <h2 className="presets-editor-title">
                                                {isCreating
                                                    ? (draft.name.trim() || 'Untitled')
                                                    : selected?.name}
                                            </h2>
                                        </div>

                                        {!isCreating && (
                                            confirmingDelete ? (
                                                <div
                                                    className="presets-confirm"
                                                    role="alertdialog"
                                                    aria-label="Confirm delete"
                                                >
                                                    <span className="presets-confirm-label">
                                                        Delete this {activeMeta.singular}?
                                                    </span>
                                                    <button
                                                        className="presets-confirm-btn yes"
                                                        onClick={handleDelete}
                                                        disabled={isDeleting}
                                                        aria-label="Confirm delete"
                                                        title="Yes, delete"
                                                    >
                                                        {isDeleting
                                                            ? <span className="presets-spinner" />
                                                            : <CheckRoundedIcon fontSize="small" />}
                                                    </button>
                                                    <button
                                                        className="presets-confirm-btn no"
                                                        onClick={() => setConfirmingDelete(false)}
                                                        disabled={isDeleting}
                                                        aria-label="Cancel delete"
                                                        title="Cancel"
                                                    >
                                                        <CloseRoundedIcon fontSize="small" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="presets-icon-actions">
                                                    <button
                                                        className="presets-icon-btn"
                                                        onClick={handleDuplicate}
                                                        title="Duplicate"
                                                        aria-label="Duplicate"
                                                    >
                                                        <ContentCopyIcon fontSize="small" />
                                                    </button>
                                                    <button
                                                        className="presets-icon-btn danger"
                                                        onClick={() => setConfirmingDelete(true)}
                                                        title="Delete"
                                                        aria-label="Delete"
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </button>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    <div className="presets-help">
                                        <button
                                            className="presets-help-toggle"
                                            onClick={() => setHelpOpen((open) => !open)}
                                            aria-expanded={helpOpen}
                                        >
                                            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                                            What is a {activeMeta.singular}?
                                        </button>

                                        {helpOpen && (
                                            <div className="presets-help-panel">
                                                <p>{activeMeta.what}</p>
                                                <p><strong>Tip:</strong> {activeMeta.tip}</p>
                                            </div>
                                        )}
                                    </div>

                                    <label className="presets-field">
                                        <span className="presets-label">Name</span>
                                        <input
                                            ref={nameInputRef}
                                            className="presets-input"
                                            value={draft.name}
                                            maxLength={MAX_NAME_LENGTH}
                                            placeholder={`e.g. ${activeMeta.example.split(',')[0]}`}
                                            onChange={updateDraft('name')}
                                        />
                                    </label>

                                    <div className="presets-prompts">
                                        <PromptBox
                                            variant="positive"
                                            title="Positive prompt"
                                            hint="What you want to see. Added to your idea."
                                            value={draft.positive}
                                            placeholder={`e.g. ${activeMeta.example}`}
                                            onChange={updateDraft('positive')}
                                        />
                                        <PromptBox
                                            variant="negative"
                                            title="Negative prompt"
                                            hint="What to avoid. Optional."
                                            value={draft.negative}
                                            placeholder={`e.g. ${activeMeta.negativeExample}`}
                                            onChange={updateDraft('negative')}
                                        />
                                    </div>

                                    {error && <div className="presets-error">{error}</div>}

                                    {/* only existing presets have images generated with them */}
                                    {!isCreating && selected && (
                                        <ReferenceImages preset={selected} meta={activeMeta} />
                                    )}
                                </div>
                            </div>

                            {/* ------------------------------ sticky save bar */}
                            <div className="presets-footer">
                                <div className="presets-footer-status">
                                    {saveHint ? (
                                        <span className="presets-status-hint">{saveHint}</span>
                                    ) : isDirty && !saving ? (
                                        <span className="presets-status-dirty">
                                            <span className="presets-dirty-dot" />
                                            Unsaved changes
                                        </span>
                                    ) : null}
                                </div>

                                {isCreating && (
                                    <button className="presets-btn" onClick={handleCancelNew}>
                                        Cancel
                                    </button>
                                )}

                                {!isCreating && isDirty && !saving && (
                                    <button className="presets-btn" onClick={handleRevert}>
                                        Discard changes
                                    </button>
                                )}

                                <button
                                    className={`presets-btn presets-btn-primary ${showSavedState ? 'saved' : ''}`}
                                    disabled={!canSave && !saving && !showSavedState}
                                    onClick={handleSave}
                                    aria-busy={saving}
                                    title="Save (Ctrl + S)"
                                >
                                    <span
                                        key={saving ? 'saving' : showSavedState ? 'saved' : 'idle'}
                                        className="presets-btn-content"
                                    >
                                        {saving && (
                                            <>
                                                <span className="presets-spinner" />
                                                Saving...
                                            </>
                                        )}
                                        {!saving && showSavedState && (
                                            <>
                                                <CheckRoundedIcon className="presets-check" fontSize="small" />
                                                Saved
                                            </>
                                        )}
                                        {!saving && !showSavedState && (
                                            isCreating ? `Create ${activeMeta.singular}` : 'Save changes'
                                        )}
                                    </span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="presets-empty">
                            <p className="presets-empty-title">
                                {categoryItems.length === 0
                                    ? `No ${activeMeta.label.toLowerCase()} yet`
                                    : `Pick a ${activeMeta.singular} to edit`}
                            </p>
                            <p className="presets-empty-text">{activeMeta.what}</p>
                            <button className="presets-btn presets-btn-primary" onClick={handleNew}>
                                <AddIcon fontSize="small" />
                                New {activeMeta.singular}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ---------------------------------------------------------- toast */}
            {toast && (
                <div key={toast.id} className={`presets-toast ${toast.kind}`} role="status" aria-live="polite">
                    <span className="presets-toast-icon">
                        {toast.kind === 'error'
                            ? <ErrorOutlineRoundedIcon fontSize="small" />
                            : toast.kind === 'info'
                                ? <InfoOutlinedIcon fontSize="small" />
                                : <CheckRoundedIcon fontSize="small" />}
                    </span>
                    <span className="presets-toast-message">{toast.message}</span>

                    {toast.action && (
                        <button
                            className="presets-toast-action"
                            onClick={toast.action.onClick}
                        >
                            {toast.action.label}
                        </button>
                    )}

                    <button className="presets-toast-close" onClick={dismissToast} aria-label="Dismiss">
                        <CloseRoundedIcon sx={{ fontSize: 16 }} />
                    </button>
                </div>
            )}
        </div>
    )
}
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useOS } from '@os/sdk'
import { EmptyState } from '@os/ui'

export interface ContactPhone {
  id: string
  label: string
  number: string
}

export interface ContactItem {
  id: string
  firstName: string
  lastName: string
  phones: ContactPhone[]
  emails: string[]
  address?: string
  birthday?: string // YYYY-MM-DD
  notes?: string
  photoPath?: string
  createdAt: number
  modifiedAt: number
}

const SAMPLE_CONTACTS: ContactItem[] = [
  {
    id: 'contact-1',
    firstName: 'Alejandro',
    lastName: 'Gómez',
    phones: [{ id: 'p1', label: 'Móvil', number: '+34 612 345 678' }],
    emails: ['alejandro.gomez@ejemplo.com'],
    address: 'Calle Mayor 14, Madrid',
    birthday: '1992-05-14',
    notes: 'Compañero de trabajo',
    createdAt: Date.now(),
    modifiedAt: Date.now()
  },
  {
    id: 'contact-2',
    firstName: 'Beatriz',
    lastName: 'Navarro',
    phones: [{ id: 'p2', label: 'Móvil', number: '+34 699 876 543' }],
    emails: ['beatriz.navarro@ejemplo.com'],
    address: 'Avenida Diagonal 220, Barcelona',
    birthday: '1995-11-20',
    notes: 'Diseñadora UX',
    createdAt: Date.now(),
    modifiedAt: Date.now()
  },
  {
    id: 'contact-3',
    firstName: 'Carlos',
    lastName: 'Mendoza',
    phones: [{ id: 'p3', label: 'Trabajo', number: '+34 911 223 344' }],
    emails: ['cmendoza@empresa.com'],
    address: 'Plaza España 5, Valencia',
    birthday: '1988-03-08',
    notes: 'Director técnico',
    createdAt: Date.now(),
    modifiedAt: Date.now()
  }
]

export default function ContactsApp(): JSX.Element {
  const os = useOS()

  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isEditing, setIsEditing] = useState<boolean>(false)

  // Form editing state
  const [formFirstName, setFormFirstName] = useState<string>('')
  const [formLastName, setFormLastName] = useState<string>('')
  const [formPhones, setFormPhones] = useState<ContactPhone[]>([])
  const [formEmails, setFormEmails] = useState<string[]>([])
  const [formAddress, setFormAddress] = useState<string>('')
  const [formBirthday, setFormBirthday] = useState<string>('')
  const [formNotes, setFormNotes] = useState<string>('')
  const [formPhotoPath, setFormPhotoPath] = useState<string | undefined>(undefined)

  // Object URL for contact photo
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    os.window.setTitle('Contactos')
  }, [os.window])

  // Load contacts
  const loadContacts = useCallback(async () => {
    const saved = await os.storage.get<ContactItem[]>('contacts_list')
    if (saved && Array.isArray(saved)) {
      setContacts(saved)
      if (saved.length > 0 && !selectedId) {
        setSelectedId(saved[0].id)
      }
    } else {
      setContacts(SAMPLE_CONTACTS)
      setSelectedId(SAMPLE_CONTACTS[0].id)
      await os.storage.set('contacts_list', SAMPLE_CONTACTS)
    }
  }, [os.storage, selectedId])

  useEffect(() => {
    loadContacts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveContacts = async (next: ContactItem[]) => {
    setContacts(next)
    await os.storage.set('contacts_list', next)
  }

  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === selectedId) || null
  }, [contacts, selectedId])

  // Load photo URL
  useEffect(() => {
    let active = true
    let revokeFn: (() => void) | null = null

    const path = isEditing ? formPhotoPath : selectedContact?.photoPath

    if (path) {
      os.fs
        .getObjectUrl(path)
        .then((res) => {
          if (active) {
            revokeFn = res.revoke
            setPhotoBlobUrl(res.url)
          } else {
            res.revoke()
          }
        })
        .catch(() => {
          if (active) setPhotoBlobUrl(null)
        })
    } else {
      setPhotoBlobUrl(null)
    }

    return () => {
      active = false
      if (revokeFn) revokeFn()
    }
  }, [selectedContact, formPhotoPath, isEditing, os.fs])

  // Start creating new contact
  const handleStartCreate = () => {
    setSelectedId(null)
    setFormFirstName('')
    setFormLastName('')
    setFormPhones([{ id: `p-${Date.now()}`, label: 'Móvil', number: '' }])
    setFormEmails([''])
    setFormAddress('')
    setFormBirthday('')
    setFormNotes('')
    setFormPhotoPath(undefined)
    setIsEditing(true)
  }

  // Start editing selected contact
  const handleStartEdit = () => {
    if (!selectedContact) return
    setFormFirstName(selectedContact.firstName)
    setFormLastName(selectedContact.lastName)
    setFormPhones(
      selectedContact.phones.length > 0
        ? [...selectedContact.phones]
        : [{ id: `p-${Date.now()}`, label: 'Móvil', number: '' }]
    )
    setFormEmails(selectedContact.emails.length > 0 ? [...selectedContact.emails] : [''])
    setFormAddress(selectedContact.address || '')
    setFormBirthday(selectedContact.birthday || '')
    setFormNotes(selectedContact.notes || '')
    setFormPhotoPath(selectedContact.photoPath)
    setIsEditing(true)
  }

  // Save form
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formFirstName.trim() && !formLastName.trim()) return

    const validPhones = formPhones.filter((p) => p.number.trim().length > 0)
    const validEmails = formEmails.filter((em) => em.trim().length > 0)

    const now = Date.now()
    if (selectedId) {
      // Update existing
      const updated: ContactItem = {
        ...selectedContact!,
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
        phones: validPhones,
        emails: validEmails,
        address: formAddress.trim() || undefined,
        birthday: formBirthday.trim() || undefined,
        notes: formNotes.trim() || undefined,
        photoPath: formPhotoPath,
        modifiedAt: now
      }
      const next = contacts.map((c) => (c.id === selectedId ? updated : c))
      await saveContacts(next)
    } else {
      // Create new
      const newContact: ContactItem = {
        id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
        phones: validPhones,
        emails: validEmails,
        address: formAddress.trim() || undefined,
        birthday: formBirthday.trim() || undefined,
        notes: formNotes.trim() || undefined,
        photoPath: formPhotoPath,
        createdAt: now,
        modifiedAt: now
      }
      const next = [...contacts, newContact]
      await saveContacts(next)
      setSelectedId(newContact.id)
    }

    setIsEditing(false)
  }

  // Delete contact
  const handleDeleteContact = async () => {
    if (!selectedContact) return
    const fullName = `${selectedContact.firstName} ${selectedContact.lastName}`.trim() || 'este contacto'

    const confirmed = await os.dialogs.confirm({
      title: 'Eliminar contacto',
      message: `¿Estás seguro de que deseas eliminar a ${fullName}?`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true
    })

    if (!confirmed) return

    const next = contacts.filter((c) => c.id !== selectedContact.id)
    await saveContacts(next)
    setSelectedId(next.length > 0 ? next[0].id : null)
    setIsEditing(false)
  }

  // Photo selection from VFS
  const handleSelectPhoto = async () => {
    const selected = await os.dialogs.openFile({
      extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg']
    })
    if (selected && selected[0]) {
      setFormPhotoPath(selected[0])
    }
  }

  // Grouped Contacts by Letter
  const groupedContacts = useMemo(() => {
    let list = contacts
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((c) => {
        const full = `${c.firstName} ${c.lastName}`.toLowerCase()
        const hasPhone = c.phones.some((p) => p.number.includes(q))
        const hasEmail = c.emails.some((em) => em.toLowerCase().includes(q))
        return full.includes(q) || hasPhone || hasEmail
      })
    }

    // Sort alphabetically by first name or last name
    const sorted = [...list].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase()
      const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase()
      return nameA.localeCompare(nameB)
    })

    const groups: Record<string, ContactItem[]> = {}
    for (const c of sorted) {
      const firstChar = (c.firstName || c.lastName || '#').charAt(0).toUpperCase()
      const key = /[A-Z]/.test(firstChar) ? firstChar : '#'
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }

    return groups
  }, [contacts, searchQuery])

  // Get Initials
  const getInitials = (c?: ContactItem | null) => {
    if (!c) return '?'
    const f = c.firstName ? c.firstName.charAt(0).toUpperCase() : ''
    const l = c.lastName ? c.lastName.charAt(0).toUpperCase() : ''
    return `${f}${l}` || '?'
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Left Sidebar: Alphabetical Contacts List */}
      <div
        style={{
          width: '280px',
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Header & Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>Contactos</span>
            <button
              type="button"
              onClick={handleStartCreate}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-color)',
                color: 'var(--accent-text)',
                border: 'none',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + Nuevo
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar por nombre, tel. o correo…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Grouped List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {Object.keys(groupedContacts).length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
              {searchQuery ? 'Sin coincidencias' : 'No hay contactos guardados'}
            </div>
          ) : (
            Object.keys(groupedContacts)
              .sort()
              .map((letter) => (
                <div key={letter} style={{ marginBottom: '10px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent-color)',
                      padding: '2px 8px',
                      marginBottom: '2px'
                    }}
                  >
                    {letter}
                  </div>

                  {groupedContacts[letter].map((contact) => {
                    const isSelected = contact.id === selectedId && !isEditing
                    const fullName = `${contact.firstName} ${contact.lastName}`.trim() || 'Contacto sin nombre'
                    const phone = contact.phones[0]?.number || ''

                    return (
                      <div
                        key={contact.id}
                        onClick={() => {
                          setSelectedId(contact.id)
                          setIsEditing(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                          border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                          cursor: 'pointer',
                          marginBottom: '2px'
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-color)',
                            color: 'var(--accent-text)',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {getInitials(contact)}
                        </div>

                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: isSelected ? 600 : 500,
                              color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {fullName}
                          </div>
                          {phone && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-tertiary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {phone}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
          )}
        </div>
      </div>

      {/* Right Pane: Contact Detail View OR Edit Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {isEditing ? (
          /* ================= EDIT / CREATE FORM ================= */
          <form onSubmit={handleSaveContact} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>
              {selectedId ? 'Editar contacto' : 'Nuevo contacto'}
            </h3>

            {/* Photo Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--accent-text)',
                  fontSize: '20px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                {photoBlobUrl ? (
                  <img src={photoBlobUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials({ firstName: formFirstName, lastName: formLastName } as ContactItem)
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectPhoto}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cambiar foto…
                </button>
                {formPhotoPath && (
                  <button
                    type="button"
                    onClick={() => setFormPhotoPath(undefined)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-tertiary)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            {/* First & Last Name */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Apellido
                </label>
                <input
                  type="text"
                  placeholder="Apellido"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Phones */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Teléfonos</label>
                <button
                  type="button"
                  onClick={() =>
                    setFormPhones([...formPhones, { id: `p-${Date.now()}`, label: 'Móvil', number: '' }])
                  }
                  style={{ border: 'none', background: 'transparent', color: 'var(--accent-color)', fontSize: '11px', cursor: 'pointer' }}
                >
                  + Añadir teléfono
                </button>
              </div>

              {formPhones.map((phone, idx) => (
                <div key={phone.id} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <select
                    value={phone.label}
                    onChange={(e) => {
                      const updated = [...formPhones]
                      updated[idx].label = e.target.value
                      setFormPhones(updated)
                    }}
                    style={{
                      width: '90px',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  >
                    <option value="Móvil">Móvil</option>
                    <option value="Trabajo">Trabajo</option>
                    <option value="Casa">Casa</option>
                    <option value="Otro">Otro</option>
                  </select>

                  <input
                    type="tel"
                    placeholder="Número de teléfono"
                    value={phone.number}
                    onChange={(e) => {
                      const updated = [...formPhones]
                      updated[idx].number = e.target.value
                      setFormPhones(updated)
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />

                  {formPhones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setFormPhones(formPhones.filter((_, i) => i !== idx))}
                      style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Email */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Correo electrónico</label>
                <button
                  type="button"
                  onClick={() => setFormEmails([...formEmails, ''])}
                  style={{ border: 'none', background: 'transparent', color: 'var(--accent-color)', fontSize: '11px', cursor: 'pointer' }}
                >
                  + Añadir correo
                </button>
              </div>

              {formEmails.map((email, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <input
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    value={email}
                    onChange={(e) => {
                      const updated = [...formEmails]
                      updated[idx] = e.target.value
                      setFormEmails(updated)
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  {formEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setFormEmails(formEmails.filter((_, i) => i !== idx))}
                      style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Dirección
              </label>
              <input
                type="text"
                placeholder="Dirección postal"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Birthday */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Cumpleaños
              </label>
              <input
                type="date"
                value={formBirthday}
                onChange={(e) => setFormBirthday(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Notas
              </label>
              <textarea
                rows={3}
                placeholder="Información adicional..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none'
                }}
              />
            </div>

            {/* Form Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--accent-text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Guardar contacto
              </button>
            </div>
          </form>
        ) : selectedContact ? (
          /* ================= DETAIL VIEW ================= */
          <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '580px' }}>
            {/* Header: Avatar, Name, and Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    fontSize: '24px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-md)',
                    flexShrink: 0
                  }}
                >
                  {photoBlobUrl ? (
                    <img src={photoBlobUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(selectedContact)
                  )}
                </div>

                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>
                    {selectedContact.firstName} {selectedContact.lastName}
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Contacto guardado
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteContact}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: '#ef4444',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>

            {/* Info Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Phones */}
              {selectedContact.phones.length > 0 && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Teléfono</span>
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedContact.phones.map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ fontWeight: 500 }}>{p.number}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emails */}
              {selectedContact.emails.length > 0 && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Correo electrónico</span>
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedContact.emails.map((em, idx) => (
                      <span key={idx} style={{ fontSize: '13px', fontWeight: 500 }}>
                        {em}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Address */}
              {selectedContact.address && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Dirección</span>
                  <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 500 }}>
                    {selectedContact.address}
                  </div>
                </div>
              )}

              {/* Birthday */}
              {selectedContact.birthday && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Cumpleaños</span>
                  <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 500 }}>
                    🎂 {selectedContact.birthday}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedContact.notes && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Notas</span>
                  <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {selectedContact.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title="Ningún contacto seleccionado"
            description="Selecciona un contacto de la lista o crea uno nuevo para ver su información."
          />
        )}
      </div>
    </div>
  )
}

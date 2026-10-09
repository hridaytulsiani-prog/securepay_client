'use client'

import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

const ISSUE_TYPES = [
  { value: 'not_received', label: 'My order shows delivered but I did not receive it' },
  { value: 'wrong_item', label: 'I received a wrong item', photoRequired: true },
  { value: 'damaged', label: 'I received a damaged item', photoRequired: true },
  { value: 'delayed', label: 'My order is delayed' },
  { value: 'refund', label: 'I have a refund problem' },
  { value: 'other', label: 'Something else' },
]

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not sure' },
]

const QUESTIONS = {
  not_received: [
    { key: 'someone_else_received', label: 'Did someone else receive the parcel?', type: 'choice' },
    { key: 'agent_contacted', label: 'Did you contact the delivery agent?', type: 'choice' },
  ],
  wrong_item: [
    { key: 'expected_item', label: 'What did you order?', type: 'text', required: true },
    { key: 'received_item', label: 'What did you receive instead?', type: 'text', required: true },
  ],
  damaged: [
    { key: 'damaged_part', label: 'What is damaged?', type: 'text', required: true },
    { key: 'unboxing_video', label: 'Do you have an unboxing video?', type: 'choice' },
  ],
  delayed: [
    { key: 'promised_date', label: 'Delivery date you were promised', type: 'text' },
    { key: 'courier_contacted', label: 'Did you contact the courier?', type: 'choice' },
  ],
  refund: [
    { key: 'refund_amount', label: 'Refund amount you expect', type: 'number' },
    { key: 'payment_reference', label: 'Payment reference or UTR', type: 'text' },
  ],
  other: [],
}

const MAX_PHOTOS = 4
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const EMPTY = { name: '', phone: '', email: '', order_id: '', issue_type: 'not_received', description: '', website: '' }

export default function ReportIssueForm() {
  const [form, setForm] = useState(EMPTY)
  const [answers, setAnswers] = useState({})
  const [photos, setPhotos] = useState([])
  const [status, setStatus] = useState({ state: 'idle', text: '', reference: '' })

  const issueType = ISSUE_TYPES.find((type) => type.value === form.issue_type)
  const questions = QUESTIONS[form.issue_type] || []
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos])
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const setAnswer = (key) => (event) => setAnswers((current) => ({ ...current, [key]: event.target.value }))

  function changeIssueType(event) {
    setForm((current) => ({ ...current, issue_type: event.target.value }))
    setAnswers({})
  }

  function addPhotos(event) {
    const chosen = Array.from(event.target.files || [])
    event.target.value = ''
    const tooBig = chosen.find((file) => file.size > MAX_PHOTO_BYTES)
    if (tooBig) {
      setStatus({ state: 'error', text: `${tooBig.name} is larger than 5 MB.`, reference: '' })
      return
    }
    setStatus({ state: 'idle', text: '', reference: '' })
    setPhotos((current) => [...current, ...chosen].slice(0, MAX_PHOTOS))
  }

  const removePhoto = (index) => setPhotos((current) => current.filter((_, position) => position !== index))

  async function handleSubmit(event) {
    event.preventDefault()
    if (status.state === 'sending') return
    if (issueType?.photoRequired && photos.length === 0) {
      setStatus({ state: 'error', text: 'Please add a photo so we can check this.', reference: '' })
      return
    }
    setStatus({ state: 'sending', text: '', reference: '' })
    try {
      const body = new FormData()
      body.append('name', form.name.trim())
      body.append('phone', form.phone.trim())
      body.append('email', form.email.trim())
      body.append('order_id', form.order_id.trim())
      body.append('issue_type', form.issue_type)
      body.append('description', form.description.trim())
      body.append('website', form.website)
      body.append('answers', JSON.stringify(answers))
      photos.forEach((file) => body.append('photos', file))
      // No Content-Type header: the browser adds the multipart boundary itself.
      const response = await fetch(`${API_BASE_URL}/adminpanel/customer-issue/`, { method: 'POST', body })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error((data && data.error) || 'Could not send your report. Please try again.')
      setStatus({ state: 'sent', text: '', reference: data.reference || '' })
    } catch (error) {
      setStatus({ state: 'error', text: error.message || 'Could not send your report. Please try again.', reference: '' })
    }
  }

  if (status.state === 'sent') {
    return (
      <section className="ri-card ri-done">
        <h1>Thanks, we have your report</h1>
        {status.reference ? (
          <p>
            Your ticket number is <strong>{status.reference}</strong>. Keep it handy.
          </p>
        ) : null}
        <p>Our team will look into it and get back to you.</p>
        <button
          type="button"
          className="ri-button"
          onClick={() => {
            setForm(EMPTY)
            setAnswers({})
            setPhotos([])
            setStatus({ state: 'idle', text: '', reference: '' })
          }}
        >
          Report another problem
        </button>
      </section>
    )
  }

  return (
    <section className="ri-card">
      <h1>Report a problem with your order</h1>
      <p className="ri-intro">Tell us what went wrong. Add your order ID or AWB number so we can find it.</p>
      <form onSubmit={handleSubmit}>
        <label>
          <span>Your name</span>
          <input value={form.name} onChange={update('name')} maxLength={120} required autoComplete="name" />
        </label>
        <div className="ri-row">
          <label>
            <span>Phone</span>
            <input value={form.phone} onChange={update('phone')} maxLength={30} autoComplete="tel" />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={form.email} onChange={update('email')} autoComplete="email" />
          </label>
        </div>
        <p className="ri-hint">Add at least one: phone or email.</p>
        <label>
          <span>Order ID or AWB number</span>
          <input value={form.order_id} onChange={update('order_id')} maxLength={80} required />
        </label>
        <label>
          <span>What is the problem?</span>
          <select value={form.issue_type} onChange={changeIssueType}>
            {ISSUE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>

        {questions.map((question) => (
          <label key={question.key}>
            <span>{question.label}{question.required ? '' : ' (optional)'}</span>
            {question.type === 'choice' ? (
              <select value={answers[question.key] || ''} onChange={setAnswer(question.key)}>
                <option value="">Choose</option>
                {YES_NO.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <input
                type={question.type === 'number' ? 'number' : 'text'}
                min={question.type === 'number' ? 0 : undefined}
                value={answers[question.key] || ''}
                onChange={setAnswer(question.key)}
                maxLength={300}
                required={Boolean(question.required)}
              />
            )}
          </label>
        ))}

        <div className="ri-photos">
          <span className="ri-photos-title">
            {issueType?.photoRequired ? 'Add photos so we can check (required)' : 'Add photos (optional)'}
          </span>
          {issueType?.photoRequired ? <p className="ri-hint">Show the item and the problem clearly. Up to {MAX_PHOTOS} photos, 5 MB each.</p> : null}
          {previews.length > 0 ? (
            <ul className="ri-photo-list">
              {previews.map((url, index) => (
                <li key={url}>
                  <img src={url} alt={`Photo ${index + 1}`} />
                  <button type="button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`}>×</button>
                </li>
              ))}
            </ul>
          ) : null}
          {photos.length < MAX_PHOTOS ? (
            <label className="ri-upload">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} />
              <span>{photos.length ? 'Add another photo' : 'Choose photos'}</span>
            </label>
          ) : null}
        </div>

        <label>
          <span>Tell us what happened</span>
          <textarea rows={5} maxLength={2000} value={form.description} onChange={update('description')} required />
        </label>
        {/* Hidden from real visitors; bots fill it in and are ignored. */}
        <input className="ri-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={update('website')} />
        {status.state === 'error' ? <p className="ri-error" role="alert">{status.text}</p> : null}
        <button type="submit" className="ri-button" disabled={status.state === 'sending'}>
          {status.state === 'sending' ? 'Sending...' : 'Submit report'}
        </button>
      </form>
    </section>
  )
}

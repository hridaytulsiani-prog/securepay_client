// NOTE: not imported anywhere in this app (UploadLabel.jsx uses
// ShipmentPdfUploader instead), and calls uploadLabelPdf(), which hits a
// route that doesn't exist on the backend (see api/labels.js). Looks like
// dead/superseded code.
import { useState } from 'react'
import { uploadLabelPdf } from '../api/labels'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

function PdfUploadForm() {
	const [orderId, setOrderId] = useState('')
	const [file, setFile] = useState(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	const handleSubmit = async (event) => {
		event.preventDefault()
		setError('')
		setSuccess('')

		if (!file) {
			setError('Please choose a PDF file before uploading.')
			return
		}

		if (file.type !== 'application/pdf') {
			setError('Only PDF files are allowed.')
			return
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			setError('PDF is too large. Maximum allowed size is 5 MB.')
			return
		}

		setIsSubmitting(true)

		try {
			await uploadLabelPdf({ file, orderId })
			setSuccess('Label uploaded successfully.')
			setOrderId('')
			setFile(null)
			event.target.reset()
		} catch (uploadError) {
			setError(uploadError.message || 'Upload failed.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<form className="card form-card" onSubmit={handleSubmit}>
			<h2>Upload Shipping Label</h2>
			<p>Attach a PDF label to an order record.</p>

			<label htmlFor="orderId">Order ID (optional)</label>
			<input
				id="orderId"
				type="text"
				value={orderId}
				onChange={(event) => setOrderId(event.target.value)}
				placeholder="ORD-10027"
			/>

			<label htmlFor="labelPdf">PDF File</label>
			<input
				id="labelPdf"
				type="file"
				accept="application/pdf"
				onChange={(event) => setFile(event.target.files?.[0] || null)}
			/>
			{file ? <p className="file-meta">Selected: {file.name}</p> : null}

			{error ? <p className="message error">{error}</p> : null}
			{success ? <p className="message success">{success}</p> : null}

			<button type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Uploading...' : 'Upload PDF'}
			</button>
		</form>
	)
}

export default PdfUploadForm


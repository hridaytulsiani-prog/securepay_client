// Real (wired-up) label upload UI — feeds the shipping-label forgery
// validator (tracking.api.v1.validate.PDFValidator via api/labels.js's
// uploadTrackingPdf). Saved validation records are shown below the form.
import { useCallback, useEffect, useState } from 'react'
import { deletePdfValidationRecord, fetchPdfValidationRecords, uploadTrackingPdf } from '../api/labels'
import { CourierLogoCell } from './CourierLogo'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const BULK_UPLOAD_CONCURRENCY = 4

function normalizeFileName(name) {
	return String(name || '').trim().toLowerCase()
}

function ShipmentPdfUploader() {
	const [pdfFiles, setPdfFiles] = useState([])
	const [progress, setProgress] = useState('')
	const [isUploading, setIsUploading] = useState(false)
	const [records, setRecords] = useState([])
	const [isLoadingRecords, setIsLoadingRecords] = useState(false)
	const [recordsError, setRecordsError] = useState('')
	const [deletingRecordId, setDeletingRecordId] = useState(null)
	const [toastMessage, setToastMessage] = useState('')

	const showToast = useCallback((message) => {
		setToastMessage('')
		window.setTimeout(() => setToastMessage(message), 0)
	}, [])

	useEffect(() => {
		if (!toastMessage) {
			return undefined
		}

		const toastTimerId = window.setTimeout(() => {
			setToastMessage('')
		}, 3600)

		return () => window.clearTimeout(toastTimerId)
	}, [toastMessage])

	const loadRecords = useCallback(async () => {
		setIsLoadingRecords(true)
		setRecordsError('')

		try {
			const response = await fetchPdfValidationRecords()
			setRecords(response.results || [])
		} catch (error) {
			setRecordsError(error.message || 'Unable to load PDF records.')
		} finally {
			setIsLoadingRecords(false)
		}
	}, [])

	useEffect(() => {
		void loadRecords()
	}, [loadRecords])

	useEffect(() => {
		if (!records.some((record) => record.status === 'processing')) {
			return undefined
		}

		const intervalId = window.setInterval(() => {
			void loadRecords()
		}, 2500)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [loadRecords, records])

	const getMerchantVisibleStatus = () => 'UNDER REVIEW'

	const handleFileSelection = (fileList) => {
		setPdfFiles(Array.from(fileList || []))
		setProgress('')
	}

	const handleUpload = async () => {
		if (pdfFiles.length === 0) {
			showToast('Please select at least one PDF file')
			return
		}

		const invalidFile = pdfFiles.find((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))
		if (invalidFile) {
			showToast(`Only PDF files are allowed. Invalid file: ${invalidFile.name}`)
			return
		}

		const oversizedFile = pdfFiles.find((file) => file.size > MAX_FILE_SIZE_BYTES)
		if (oversizedFile) {
			showToast(`PDF is too large: ${oversizedFile.name}. Maximum allowed size is 10 MB.`)
			return
		}

		const selectedFileNames = pdfFiles.map((file) => normalizeFileName(file.name))
		const duplicateSelectedFileName = selectedFileNames.find((fileName, index) => selectedFileNames.indexOf(fileName) !== index)
		if (duplicateSelectedFileName) {
			showToast('This PDF is already selected.')
			return
		}

		const uploadedFileNames = new Set(records.map((record) => normalizeFileName(record.file_name)))
		const alreadyUploadedFile = pdfFiles.find((file) => uploadedFileNames.has(normalizeFileName(file.name)))
		if (alreadyUploadedFile) {
			showToast(`This PDF is already uploaded: ${alreadyUploadedFile.name}`)
			return
		}

		if (!window.confirm(`Upload ${pdfFiles.length} PDF${pdfFiles.length === 1 ? '' : 's'}?`)) {
			return
		}

		setIsUploading(true)
		setProgress(`Uploading 0/${pdfFiles.length} PDFs...`)

		try {
			const results = []
			let nextIndex = 0
			let completedCount = 0

			const uploadNextFile = async () => {
				const fileIndex = nextIndex
				nextIndex += 1

				if (fileIndex >= pdfFiles.length) {
					return
				}

				const file = pdfFiles[fileIndex]
				try {
					const response = await uploadTrackingPdf({
						file,
					})
					results[fileIndex] = { file, ok: true, response }
					if (response.upload_record) {
						setRecords((currentRecords) => {
							const existingRecords = currentRecords.filter((record) => record.id !== response.upload_record.id)
							return [response.upload_record, ...existingRecords]
						})
					}
				} catch (error) {
					results[fileIndex] = { file, ok: false, error }
				} finally {
					completedCount += 1
					setProgress(`Uploading ${completedCount}/${pdfFiles.length} PDFs...`)
					await uploadNextFile()
				}
			}

			const workerCount = Math.min(BULK_UPLOAD_CONCURRENCY, pdfFiles.length)
			await Promise.all(Array.from({ length: workerCount }, () => uploadNextFile()))

			const failedResults = results.filter((result) => result && !result.ok)
			const successfulCount = results.length - failedResults.length
			const rejectedSummary = failedResults
				.map((result) => `${result.file.name}: ${result.error?.message || 'Not uploaded'}`)
				.join(', ')
			setProgress(`${successfulCount}/${pdfFiles.length} PDFs uploaded.${successfulCount ? ' Validation is running in the background.' : ''}${failedResults.length ? ` Not uploaded: ${rejectedSummary}` : ''}`)
			showToast(`${successfulCount} PDF${successfulCount === 1 ? '' : 's'} uploaded and ${failedResults.length} PDF${failedResults.length === 1 ? '' : 's'} not uploaded.${failedResults.length ? ` ${rejectedSummary}` : ' Validation is running in the background.'}`)
			setPdfFiles([])
			await loadRecords()
		} catch (error) {
			setProgress(`PDF upload failed: ${error.message}`)
			showToast(`PDF upload failed: ${error.message}`)
		} finally {
			setIsUploading(false)
		}
	}

	const handleDeleteRecord = async (record) => {
		if (!window.confirm(`Remove PDF record: ${record.file_name || 'this file'}?`)) {
			return
		}

		setDeletingRecordId(record.id)
		setRecordsError('')

		try {
			await deletePdfValidationRecord(record.id)
			await loadRecords()
		} catch (error) {
			setRecordsError(error.message || 'Unable to delete PDF record.')
			showToast(`Delete failed: ${error.message}`)
		} finally {
			setDeletingRecordId(null)
		}
	}

	return (
		<>
		{toastMessage ? (
			<div className="page-toast" role="status" aria-live="polite">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm.9 13.5h-1.8v-1.8h1.8Zm0-3.6h-1.8V7.5h1.8Z" />
				</svg>
				<div>
					<strong>Upload label</strong>
					<span>{toastMessage}</span>
				</div>
			</div>
		) : null}

		<div className="dashboard-overview">
			<div className="dashboard-hero">
				<div>
					<p className="dashboard-eyebrow">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M5.5 4h13A2.5 2.5 0 0 1 21 6.5v10A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10A2.5 2.5 0 0 1 5.5 4Zm2 2A1.5 1.5 0 0 0 6 7.5V9h12V7.5A1.5 1.5 0 0 0 16.5 6h-9ZM6 11v5.5A.5.5 0 0 0 6.5 17h11a.5.5 0 0 0 .5-.5V11h-4v1.25a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V11H6Z" />
						</svg>
						Label validation
					</p>
					<h2 className="dashboard-title">Upload label</h2>
					<p>Upload courier PDF labels so EscroSafe can keep shipment evidence connected to merchant orders.</p>
				</div>
			</div>
		</div>

		<div className="card table-card console-card">
			<div className="dashboard-table-toolbar">
				<div className="table-head">
					<h3>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 3a1 1 0 0 1 1 1v9.09l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 13a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V17a1 1 0 0 1 1-1Z" />
						</svg>
						Upload shipment PDF
					</h3>
				</div>

				<div className="tracking-row upload-pdf-row">
					<label className="upload-pdf-field">
						PDF Files
						<input
							type="file"
							accept="application/pdf,.pdf"
							multiple
							onChange={(event) => handleFileSelection(event.target.files)}
						/>
					</label>

					<div className="tracking-actions-column end-align">
						<button type="button" onClick={() => void handleUpload()} disabled={isUploading}>
							{isUploading ? 'Uploading...' : 'Upload PDFs'}
						</button>
						<button type="button" className="secondary-btn" onClick={() => void loadRecords()} disabled={isLoadingRecords}>
							{isLoadingRecords ? 'Refreshing...' : 'Refresh'}
						</button>
					</div>
				</div>

				{pdfFiles.length > 0 ? (
					<p className="file-meta">
						Selected: {pdfFiles.length} PDF{pdfFiles.length === 1 ? '' : 's'} ({pdfFiles.map((file) => file.name).join(', ')})
					</p>
				) : null}
				<div className="muted-text small-text">{progress}</div>
			</div>

			{recordsError ? <p className="message error">{recordsError}</p> : null}

			<div className="shipments-scroll">
				<table className="shipments-table" aria-label="PDF validation records table">
					<thead>
						<tr>
							<th>PDF Name</th>
							<th>Status</th>
							<th>Courier</th>
							<th>Courier Partner</th>
							<th>AWB</th>
							<th>Order ID</th>
							<th>Upload Time</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{records.length === 0 && !isLoadingRecords ? (
							<tr>
								<td colSpan="8" className="empty-cell">
									No PDF records found
								</td>
							</tr>
						) : null}

						{records.map((record) => (
							<tr key={record.id}>
								<td>{record.file_name || '-'}</td>
								<td>
									<span className="status-badge status-pending">
										{getMerchantVisibleStatus(record)}
									</span>
								</td>
								<td>
									<CourierLogoCell courier={record.delivery_partner} />
								</td>
								<td>
									<CourierLogoCell courier={record.courier_partner} />
								</td>
								<td className="mono-text">{record.awb || '-'}</td>
								<td className="mono-text">{record.order_id || '-'}</td>
								<td>{record.uploaded_at ? new Date(record.uploaded_at).toLocaleString() : '-'}</td>
								<td>
									<button type="button" className="secondary-btn" onClick={() => void handleDeleteRecord(record)} disabled={deletingRecordId === record.id}>
										{deletingRecordId === record.id ? 'Removing...' : 'Remove'}
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
		</>
	)
}

export default ShipmentPdfUploader

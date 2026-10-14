// Real (wired-up) label upload UI — feeds the shipping-label forgery
// validator (tracking.api.v1.validate.PDFValidator via api/labels.js's
// uploadTrackingPdf). Saved validation records are shown below the form.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deletePdfValidationRecord, fetchPdfValidationRecords, uploadTrackingPdf } from '../api/labels'
import { CourierLogoCell } from './CourierLogo'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const BULK_UPLOAD_CONCURRENCY = 4

function normalizeFileName(name) {
	return String(name || '').trim().toLowerCase()
}

function sanitizeBrandText(message) {
	return String(message || '').replace(/SecurePay/g, 'EscroSafe')
}

function ShipmentPdfUploader() {
	const navigate = useNavigate()
	const [pdfFiles, setPdfFiles] = useState([])
	const [progress, setProgress] = useState('')
	const [isUploading, setIsUploading] = useState(false)
	const [records, setRecords] = useState([])
	const [updatingRecords, setUpdatingRecords] = useState({})
	const [isLoadingRecords, setIsLoadingRecords] = useState(false)
	const [recordsError, setRecordsError] = useState('')
	const [updatingRecordId, setUpdatingRecordId] = useState(null)
	const [toast, setToast] = useState(null)
	const [isUploadConfirmOpen, setIsUploadConfirmOpen] = useState(false)

	const showToast = useCallback((message, tone = 'info') => {
		const cleanMessage = sanitizeBrandText(message)
		setToast(null)
		window.setTimeout(() => setToast({ message: cleanMessage, tone }), 0)
	}, [])

	useEffect(() => {
		if (!toast?.message) {
			return undefined
		}

		const toastTimerId = window.setTimeout(() => {
			setToast(null)
		}, 3600)

		return () => window.clearTimeout(toastTimerId)
	}, [toast])

	const loadRecords = useCallback(async () => {
		setIsLoadingRecords(true)
		setRecordsError('')

		try {
			const response = await fetchPdfValidationRecords()
			setRecords((currentRecords) => {
				const nextRecords = response.results || []
				const updatingPlaceholders = Object.values(updatingRecords)
				if (updatingPlaceholders.length === 0) {
					return nextRecords
				}

				const nextRecordIds = new Set(nextRecords.map((record) => record.id))
				const preservedRows = updatingPlaceholders.filter((record) => !nextRecordIds.has(record.id))
				return [...preservedRows, ...nextRecords]
			})
		} catch (error) {
			setRecordsError(error.message || 'Unable to load PDF records.')
		} finally {
			setIsLoadingRecords(false)
		}
	}, [updatingRecords])

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

	const getMerchantVisibleStatus = (record) => {
		if (record?.status === 'approved') return 'ACCEPTED'
		if (record?.status === 'not_approved') return 'REJECTED'
		return 'UNDER REVIEW'
	}

	const getStatusClassName = (record) => {
		if (record?.status === 'approved') return 'status-badge status-success'
		if (record?.status === 'not_approved') return 'status-badge status-rejected'
		return 'status-badge status-pending'
	}

	const getReasonClassName = (record) => {
		return record?.status === 'approved' ? 'label-reason-cell reason-accepted' : 'label-reason-cell'
	}

	const getMerchantVisibleReason = (record) => {
		if (record?.reason) return sanitizeBrandText(record.reason)
		if (record?.status === 'approved') return 'Label accepted'
		if (record?.status === 'not_approved') return 'Label could not be verified'
		return 'Checking label'
	}

	const renderMerchantVisibleReason = (record) => {
		const reason = getMerchantVisibleReason(record)
		if (reason === 'Courier branding could not be verified') {
			return (
				<>
					<span>Courier branding</span>
					<span>could not be verified</span>
				</>
			)
		}
		return <span>{reason}</span>
	}

	const handleFileSelection = (fileList) => {
		setPdfFiles(Array.from(fileList || []))
		setProgress('')
	}

	const handleUpload = () => {
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

		setIsUploadConfirmOpen(true)
	}

	const confirmUpload = async () => {
		setIsUploadConfirmOpen(false)

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
			const successfulResults = results.filter((result) => result && result.ok)
			const rejectedSummary = failedResults
				.map((result) => `${result.file.name}: ${sanitizeBrandText(result.error?.message || 'Not uploaded')}`)
				.join('\n')
			const successSummary =
				successfulResults.length === 1
					? `${successfulResults[0].file.name} uploaded successfully.`
					: `${successfulResults.length} PDFs uploaded successfully.`
			setProgress(failedResults.length ? rejectedSummary : successSummary)
			showToast(failedResults.length ? rejectedSummary : successSummary, failedResults.length ? 'error' : 'success')
			setPdfFiles([])
			await loadRecords()
		} catch (error) {
			setProgress(`PDF upload failed: ${error.message}`)
			showToast(`PDF upload failed: ${error.message}`, 'error')
		} finally {
			setIsUploading(false)
		}
	}

	const handleUpdateRecord = async (record, fileList) => {
		const file = fileList?.[0]
		if (!file) {
			return
		}

		if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
			showToast(`Only PDF files are allowed. Invalid file: ${file.name}`)
			return
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			showToast(`PDF is too large: ${file.name}. Maximum allowed size is 10 MB.`)
			return
		}

		if (!record.order_id) {
			showToast('Order ID is missing for this PDF record.', 'error')
			return
		}

		setUpdatingRecordId(record.id)
		setUpdatingRecords((currentRecords) => ({
			...currentRecords,
			[record.id]: {
				...record,
				file_name: file.name,
				status: 'processing',
				reason: 'Uploading replacement label',
			},
		}))
		setRecords((currentRecords) =>
			currentRecords.map((item) =>
				item.id === record.id
					? {
							...item,
							file_name: file.name,
							status: 'processing',
							reason: 'Uploading replacement label',
						}
					: item,
			),
		)
		setRecordsError('')

		try {
			const isSameFileName = normalizeFileName(file.name) === normalizeFileName(record.file_name)
			let response

			if (isSameFileName) {
				await deletePdfValidationRecord(record.id)
				response = await uploadTrackingPdf({
					file,
					secureupiOrderId: record.order_id,
				})
			} else {
				response = await uploadTrackingPdf({
					file,
					secureupiOrderId: record.order_id,
				})
				await deletePdfValidationRecord(record.id)
			}

			if (response.upload_record) {
				setRecords((currentRecords) => [response.upload_record, ...currentRecords.filter((item) => item.id !== record.id)])
			}
			setUpdatingRecords((currentRecords) => {
				const nextRecords = { ...currentRecords }
				delete nextRecords[record.id]
				return nextRecords
			})
			showToast('PDF updated. Validation is running in the background.', 'success')
			await loadRecords()
		} catch (error) {
			setRecordsError(error.message || 'Unable to update PDF record.')
			showToast(`Update failed: ${error.message}`, 'error')
			await loadRecords()
		} finally {
			setUpdatingRecords((currentRecords) => {
				const nextRecords = { ...currentRecords }
				delete nextRecords[record.id]
				return nextRecords
			})
			setUpdatingRecordId(null)
		}
	}

	const openSupportForRecord = (record) => {
		const params = new URLSearchParams({
			raise: '1',
			issueType: 'other',
			description: `PDF label rejected for this order.${record.awb ? `\nAWB: ${record.awb}` : ''}`,
		})

		if (record.order_id) {
			params.set('orderId', record.order_id)
		}
		if (record.awb) {
			params.set('awb', record.awb)
		}

		navigate(`/support?${params.toString()}`)
	}

	return (
		<>
		{toast?.message ? (
			<div className={`page-toast page-toast-${toast.tone || 'info'}`} role="status" aria-live="polite">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm.9 13.5h-1.8v-1.8h1.8Zm0-3.6h-1.8V7.5h1.8Z" />
				</svg>
				<div>
					<strong>Upload label</strong>
					<span>{toast.message}</span>
				</div>
			</div>
		) : null}

		{isUploadConfirmOpen ? (
			<div className="label-upload-modal-backdrop" role="presentation" onMouseDown={() => setIsUploadConfirmOpen(false)}>
				<div
					className="label-upload-modal"
					role="dialog"
					aria-modal="true"
					aria-labelledby="label-upload-confirm-title"
					onMouseDown={(event) => event.stopPropagation()}
				>
					<div className="label-upload-modal-head">
						<div>
							<span>Confirm upload</span>
							<h2 id="label-upload-confirm-title">Upload selected PDFs?</h2>
						</div>
						<button type="button" className="label-upload-modal-close" aria-label="Close" onClick={() => setIsUploadConfirmOpen(false)}>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M6 6l12 12M18 6 6 18" />
							</svg>
						</button>
					</div>
					<p className="label-upload-modal-copy">
						{pdfFiles.length} PDF{pdfFiles.length === 1 ? '' : 's'} will be uploaded for label validation.
					</p>
					<ul className="label-upload-file-list">
						{pdfFiles.map((file) => (
							<li key={`${file.name}-${file.size}`}>{file.name}</li>
						))}
					</ul>
					<div className="label-upload-modal-actions">
						<button type="button" onClick={() => void confirmUpload()}>
							Upload
						</button>
					</div>
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
						<span className="upload-pdf-picker" aria-hidden="true">
							<span className="upload-pdf-icon">
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path d="M7 18a5 5 0 0 1 1.2-9.85A6 6 0 0 1 19.5 10.5 3.8 3.8 0 0 1 19 18h-3.5" />
									<path d="M12 18V11" />
									<path d="m9 14 3-3 3 3" />
								</svg>
							</span>
							<em>
								{pdfFiles.length === 0
									? 'No file chosen'
									: pdfFiles.length === 1
										? pdfFiles[0].name
										: `${pdfFiles.length} files selected`}
							</em>
						</span>
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
							<th>Reason</th>
							<th>Action</th>
							<th>Support</th>
						</tr>
					</thead>
					<tbody>
						{records.length === 0 && !isLoadingRecords ? (
							<tr>
								<td colSpan="10" className="empty-cell">
									No PDF records found
								</td>
							</tr>
						) : null}

						{records.map((record) => (
							<tr key={record.id}>
								<td>{record.file_name || '-'}</td>
								<td>
									<span className={getStatusClassName(record)}>
										{getMerchantVisibleStatus(record)}
									</span>
								</td>
								<td className="courier-logo-table-cell">
									<span className="courier-logo-slot">
										<CourierLogoCell courier={record.delivery_partner} />
									</span>
								</td>
								<td>
									<CourierLogoCell courier={record.courier_partner} />
								</td>
								<td className="mono-text">{record.awb || '-'}</td>
								<td className="mono-text">{record.order_id || '-'}</td>
								<td>{record.uploaded_at ? new Date(record.uploaded_at).toLocaleString() : '-'}</td>
								<td className={getReasonClassName(record)}>{renderMerchantVisibleReason(record)}</td>
								<td>
									<label className={`table-file-action ${updatingRecordId === record.id ? 'is-disabled' : ''}`}>
										<span>{updatingRecordId === record.id ? 'Updating...' : 'Update'}</span>
										<input
											type="file"
											accept="application/pdf,.pdf"
											disabled={updatingRecordId === record.id}
											onChange={(event) => {
												void handleUpdateRecord(record, event.target.files)
												event.target.value = ''
											}}
										/>
									</label>
								</td>
								<td>
									{record.status === 'not_approved' ? (
										<button type="button" className="secondary-btn" onClick={() => openSupportForRecord(record)}>
											Contact
										</button>
									) : (
										'-'
									)}
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

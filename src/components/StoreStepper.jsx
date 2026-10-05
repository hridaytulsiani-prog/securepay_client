function StoreStepper({ qty, onDec, onInc, small = false }) {
	return (
		<div className={`so-stepper${small ? ' sm' : ''}`}>
			<button type="button" aria-label="Decrease quantity" onClick={onDec}>{qty === 1 ? '🗑' : '−'}</button>
			<span>{qty}</span>
			<button type="button" aria-label="Increase quantity" onClick={onInc}>+</button>
		</div>
	)
}

export default StoreStepper

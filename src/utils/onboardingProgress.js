const ONBOARDING_PROGRESS_PREFIX = 'escrosafe_onboarding_progress'

function merchantStorageId(user) {
	return user?.id || user?.merchant_id || user?.merchant_key || user?.email || 'merchant'
}

export function getOnboardingProgressKey(user) {
	return `${ONBOARDING_PROGRESS_PREFIX}:${merchantStorageId(user)}`
}

export function loadOnboardingProgress(user) {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(getOnboardingProgressKey(user)) || 'null')
		return parsed && typeof parsed === 'object' ? parsed : null
	} catch {
		return null
	}
}

export function saveOnboardingProgress(user, progress) {
	window.localStorage.setItem(getOnboardingProgressKey(user), JSON.stringify({
		...progress,
		updatedAt: new Date().toISOString(),
	}))
}

export function clearOnboardingProgress(user) {
	window.localStorage.removeItem(getOnboardingProgressKey(user))
}

export function hasIncompleteOnboardingProgress(user) {
	const progress = loadOnboardingProgress(user)
	return Boolean(progress?.hasStarted && !progress?.completed)
}

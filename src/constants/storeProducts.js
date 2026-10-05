const unsplash = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`
const IMG_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#f0f2f2"/><text x="150" y="158" font-family="Arial" font-size="18" fill="#999" text-anchor="middle">Image unavailable</text></svg>')}`

export const STORE_PRODUCTS = [
	{ id: 'p1', brand: 'boAt', name: 'Rockerz 450 Bluetooth On-Ear Headphones with 15H Playback, Padded Ear Cushions | Black', price: 1299, mrp: 3990, rating: 4.4, reviews: '84,512', bought: '5K+ bought in past month', deal: 'Limited time deal', delivery: 'Sat, 3 Oct', img: unsplash('photo-1505740420928-5e560c06d30e') },
	{ id: 'p2', brand: 'Noise', name: 'ColorFit Pro 4 Alpha 1.78" AMOLED Smart Watch, Bluetooth Calling, 100+ Sports Modes | Jet Black', price: 2499, mrp: 5999, rating: 4.2, reviews: '21,387', bought: '2K+ bought in past month', deal: 'Limited time deal', delivery: 'Sun, 4 Oct', img: unsplash('photo-1523275335684-37898b6baf30') },
	{ id: 'p3', brand: 'Puma', name: "Men's Softride Enzo Evo Running Shoes | Lightweight, Cushioned Sole, Breathable Mesh Upper", price: 2199, mrp: 5999, rating: 4.3, reviews: '9,846', bought: '1K+ bought in past month', deal: 'Sale Price Live', delivery: 'Sat, 3 Oct', img: unsplash('photo-1542291026-7eec264c27ff') },
	{ id: 'p4', brand: 'Wildcraft', name: '35L Water-Resistant Laptop Backpack with USB Charging Port, Padded Straps | Unisex Travel Bag', price: 899, mrp: 2495, rating: 4.5, reviews: '38,204', bought: '3K+ bought in past month', deal: 'Limited time deal', delivery: 'Mon, 5 Oct', img: unsplash('photo-1553062407-98eeb64c6a62') },
	{ id: 'p5', brand: 'Fastrack', name: 'UV Protected Wayfarer Sunglasses for Men & Women | Polarized Lens, Lightweight Frame', price: 649, mrp: 1495, rating: 4.1, reviews: '12,930', bought: '800+ bought in past month', deal: 'Sale Price Live', delivery: 'Sun, 4 Oct', img: unsplash('photo-1572635196237-14b3f281503f') },
	{ id: 'p6', brand: 'JBL', name: 'Flip Essential 2 Portable Bluetooth Speaker, Powerful Sound, 10H Playtime, IPX7 Waterproof', price: 6499, mrp: 9999, rating: 4.6, reviews: '15,772', bought: '1K+ bought in past month', deal: 'Limited time deal', delivery: 'Sat, 3 Oct', img: unsplash('photo-1608043152269-423dbba4e7e1') },
	{ id: 'p7', brand: 'Samsung', name: 'Galaxy M35 5G (Moonlight Blue, 8GB RAM, 128GB Storage) | 50MP Triple Camera, 6000mAh Battery', price: 16999, mrp: 24999, rating: 4.3, reviews: '19,204', bought: '4K+ bought in past month', deal: 'Limited time deal', delivery: 'Sat, 3 Oct', img: unsplash('photo-1511707171634-5f897ff02aa9') },
	{ id: 'p8', brand: 'Canon', name: 'EOS 1500D 24.1 Digital SLR Camera with 18-55mm Lens, Wi-Fi, Full HD Video | Black', price: 34999, mrp: 45995, rating: 4.5, reviews: '6,318', bought: '500+ bought in past month', deal: 'Sale Price Live', delivery: 'Mon, 5 Oct', img: unsplash('photo-1526170375885-4d8ecf77b99f') },
	{ id: 'p9', brand: 'Ant Esports', name: 'MK1000 Mechanical Gaming Keyboard, Blue Switches, RGB Backlit, Anti-Ghosting | Wired', price: 1799, mrp: 3999, rating: 4.2, reviews: '11,076', bought: '2K+ bought in past month', deal: 'Limited time deal', delivery: 'Sun, 4 Oct', img: unsplash('photo-1587829741301-dc798b83add3') },
	{ id: 'p10', brand: 'Logitech', name: 'M331 Silent Plus Wireless Mouse, 2.4GHz USB Receiver, 90% Less Noise, 24-Month Battery | Black', price: 899, mrp: 1495, rating: 4.4, reviews: '52,689', bought: '3K+ bought in past month', deal: 'Sale Price Live', delivery: 'Sat, 3 Oct', img: unsplash('photo-1527864550417-7fd91fc51a46') },
]

export const formatInr = (value) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function renderStars(rating) {
	const full = Math.floor(rating)
	const half = rating - full >= 0.5
	return '★'.repeat(full) + (half ? '⯨' : '') + '☆'.repeat(5 - full - (half ? 1 : 0))
}

export function handleImgError(event) {
	event.currentTarget.onerror = null
	event.currentTarget.src = IMG_FALLBACK
}

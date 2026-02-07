
const banner = document.createElement('div')
banner.textContent = '[Extension well injected]'
banner.style.position = 'fixed'
banner.style.top = '0'
banner.style.left = '0'
banner.style.width = '100%'
banner.style.height = '32px'
banner.style.backgroundColor = '#333'
banner.style.color = '#fff'
banner.style.display = 'flex'
banner.style.alignItems = 'center'
banner.style.justifyContent = 'center'
banner.style.fontSize = '14px'
banner.style.zIndex = '9999'
banner.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)'

document.body.style.paddingTop = '32px'

document.body.appendChild(banner)


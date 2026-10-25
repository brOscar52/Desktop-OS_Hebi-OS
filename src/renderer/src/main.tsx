import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/inter'
import './system/theme/tokens.css'
import { Shell } from './os/shell'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Shell />
  </React.StrictMode>
)

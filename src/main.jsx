import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import './styles/buttons.css'
import './styles/landing.css'
import './styles/sidebar.css'
import './styles/editor.css'
import './styles/content.css'
import './styles/modals.css'
import './styles/wizard.css'
import './styles/chapterDetail.css'
import './styles/responsive.css'
import './styles/autoWorkflow.css'
import App from './App.jsx'
import PasswordGate from './components/auth/PasswordGate.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <PasswordGate>
            <App />
        </PasswordGate>
    </StrictMode>,
)

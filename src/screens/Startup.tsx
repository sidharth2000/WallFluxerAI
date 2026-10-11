import { useEffect, useState } from 'react'

import './Startup.css'

import icon from '../assets/wallfluxer-icon.png'


const MESSAGES = [
  'Waking up the engine',
  'Loading your models',
  'Getting things ready',
  'Almost there',
]

const MESSAGE_INTERVAL_MS = 2600


type StartupProps = {
  failed: boolean
  onRetry: () => void
}


function Startup({ failed, onRetry }: StartupProps) {

  const [index, setIndex] = useState(0)

  // Step through the messages, then rest on the last one.
  useEffect(() => {

    if (failed) return

    const timer = setInterval(() => {
      setIndex((i) => Math.min(i + 1, MESSAGES.length - 1))
    }, MESSAGE_INTERVAL_MS)

    return () => clearInterval(timer)

  }, [failed])


  return (
    <div className={`startup ${failed ? 'startup--failed' : ''}`}>

      {/* flowing colour background */}
      <div className="startup-blob startup-blob--a" />
      <div className="startup-blob startup-blob--b" />
      <div className="startup-blob startup-blob--c" />

      {/* film grain */}
      <div className="startup-grain" />

      {/* soft vignette */}
      <div className="startup-vignette" />


      <div className="startup-center">

        <div className="startup-logo-wrap">
          <span className="startup-ring" />
          <span className="startup-ring startup-ring--delay" />
          <img
            className="startup-logo"
            src={icon}
            alt="WallFluxer"
            draggable={false}
          />
        </div>

        <h1 className="startup-name">WallFluxer</h1>

        {failed ? (
          <>
            <p className="startup-status">The background engine didn't respond.</p>
            <button className="startup-retry" onClick={onRetry}>
              Try again
            </button>
          </>
        ) : (
          <>
            <p className="startup-status" key={index}>
              {MESSAGES[index]}
              <span className="startup-dots" />
            </p>
            <div className="startup-bar">
              <span className="startup-bar-fill" />
            </div>
          </>
        )}

      </div>

    </div>
  )
}


export default Startup
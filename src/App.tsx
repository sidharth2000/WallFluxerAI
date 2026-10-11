import './App.css'

import { useState } from 'react'

import Sidebar from './components/Sidebar'

import Create from './screens/Create'
import MyModels from './screens/MyModels'
import MyWallpapers from './screens/MyWallpaper'
import PromptPresets from './screens/PromptPresets'
import Settings from './screens/Settings'
import Startup from './screens/Startup'

import { useApiReady } from './api/Useapiready'



function App() {

  const [page, setPage] = useState('create')

  const { status, retry } = useApiReady()


  const renderPage = () => {

    switch (page) {

      case 'create':
        return <Create />

      case 'models':
        return <MyModels />

      case 'wallpapers':
        return <MyWallpapers />
      
      case 'presets':
        return <PromptPresets />

      case 'settings':
        return <Settings />

      default:
        return <Create />
    }
  }


  // Hold the whole app back until the backend answers /health,
  // so no screen fires requests at an API that isn't up yet.
  if (status !== 'ready') {
    return (
      <Startup
        failed={status === 'failed'}
        onRetry={retry}
      />
    )
  }


  return (
    <div className="app">

      <Sidebar
        page={page}
        setPage={setPage}
      />

      <main className="main-content">

        {renderPage()}

      </main>

    </div>
  )
}


export default App
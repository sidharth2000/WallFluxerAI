// -----------------------------------------------------------------
// API handlers for wallapaper management screen
// -----------------------------------------------------------------
import wallfluxer from "./wallfluxer"

export const getWallpapers = () => {

  return wallfluxer.get("/wallpaper/all")

}

export const applyWallpaper = (wallpaperPath: string) => {

  return wallfluxer.post("/wallpaper/apply-wallpaper", {
    wallpaper_path: wallpaperPath,
  })

}

export const deleteWallpaper = (wallpaperId: number) => {

  return wallfluxer.delete(`/wallpaper/delete/${wallpaperId}`)

}
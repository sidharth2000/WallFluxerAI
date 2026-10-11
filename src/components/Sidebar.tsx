import * as React from 'react'
import { styled, Theme, CSSObject } from '@mui/material/styles'

import MuiDrawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'

import WallpaperIcon from '@mui/icons-material/Wallpaper'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CollectionsIcon from '@mui/icons-material/Collections'
import TuneIcon from '@mui/icons-material/Tune'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'

import { useTheme } from '../context/ThemeContext'
import logo from '../assets/wallfluxer-icon.png'

import './Sidebar.css'

const drawerWidth = 220

/* ---------- Drawer styling ---------- */

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  overflowX: 'hidden',
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
})

const closedMixin = (theme: Theme): CSSObject => ({
  width: `calc(${theme.spacing(7)} + 1px)`,
  overflowX: 'hidden',
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
})

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 2),
  minHeight: 64,
}))

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  variants: [
    {
      props: ({ open }) => open,
      style: {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
      },
    },
    {
      props: ({ open }) => !open,
      style: {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
      },
    },
  ],
}))

/* ---------- Menu config ---------- */

type MenuItem = {
  label: string
  page: string
  icon: React.ReactNode
}

const menuItems: MenuItem[] = [
  { label: 'Create', page: 'create', icon: <WallpaperIcon /> },
  { label: 'Models', page: 'models', icon: <SmartToyIcon /> },
  { label: 'My Wallpapers', page: 'wallpapers', icon: <CollectionsIcon /> },
  { label: 'Prompt Presets', page: 'presets', icon: <TuneIcon /> },
]

/* ---------- Reusable nav item ---------- */

type NavItemProps = {
  label: string
  icon: React.ReactNode
  open: boolean
  selected?: boolean
  onClick: () => void
}

function NavItem({ label, icon, open, selected, onClick }: NavItemProps) {
  return (
    <ListItem disablePadding sx={{ display: 'block' }}>
      <ListItemButton
        selected={selected}
        onClick={onClick}
        sx={{
          minHeight: 48,
          px: 2.5,
          justifyContent: open ? 'initial' : 'center',
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            justifyContent: 'center',
            mr: open ? 3 : 'auto',
          }}
        >
          {icon}
        </ListItemIcon>

        <ListItemText primary={label} sx={{ opacity: open ? 1 : 0 }} />
      </ListItemButton>
    </ListItem>
  )
}

/* ---------- Sidebar ---------- */

type SidebarProps = {
  page: string
  setPage: (page: string) => void
}

export default function Sidebar({ page, setPage }: SidebarProps) {
  const [open, setOpen] = React.useState(false)
  const { theme, setTheme } = useTheme()

  const isDark = theme === 'dark'

  return (
    <Drawer
      variant="permanent"
      open={open}
      className="app-sidebar"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Logo */}
      <DrawerHeader>
        <Box
          component="img"
          src={logo}
          alt="Wallfluxer logo"
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />

        <Box
          className="app-sidebar-wordmark"
          sx={{
            ml: 1.5,
            fontWeight: 700,
            fontSize: 18,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            opacity: open ? 1 : 0,
            width: open ? 'auto' : 0,
            transition: 'opacity 0.15s ease',
          }}
        >
          WALLFLUXER
        </Box>
      </DrawerHeader>

      <Divider />

      {/* Main navigation */}
      <List>
        {menuItems.map((item) => (
          <NavItem
            key={item.page}
            label={item.label}
            icon={item.icon}
            open={open}
            selected={page === item.page}
            onClick={() => setPage(item.page)}
          />
        ))}
      </List>

      {/* Push theme switcher to bottom */}
      <Box sx={{ flexGrow: 1 }} />

      <Divider />

      {/* Theme switcher */}
      <List>
        <NavItem
          label={isDark ? 'Light Mode' : 'Dark Mode'}
          icon={isDark ? <LightModeIcon /> : <DarkModeIcon />}
          open={open}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        />
      </List>
    </Drawer>
  )
}
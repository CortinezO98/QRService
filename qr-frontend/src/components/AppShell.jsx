import Navbar from './Navbar'

export default function AppShell({ children }) {
  return (
    <div className="app-bg min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-6 py-6 safe-bottom sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        {children}
      </main>
    </div>
  )
}
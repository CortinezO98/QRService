import Navbar from './Navbar'

export default function AppShell({ children }) {
  return (
    <div className="app-bg min-h-screen">
      <Navbar />
      <main className="container safe-bottom py-8 lg:py-10">
        {children}
      </main>
    </div>
  )
}

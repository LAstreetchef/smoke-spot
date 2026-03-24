export const metadata = { title: 'Vibe Check' }
export default function VibecheckPage() {
  return (
    <main style={{margin:0,padding:0,overflow:'hidden'}}>
      <iframe
        src="https://vibecheck-git-master-smokespot.vercel.app"
        style={{width:'100vw',height:'100vh',border:'none',display:'block'}}
      />
    </main>
  )
}

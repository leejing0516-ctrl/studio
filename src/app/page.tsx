export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-primary">歡迎來到南梓實小虛擬銀行</h1>
          <p className="text-lg text-foreground/80 mt-2">您通往金融素養的門戶，在這裡學習金錢知識既有回報又充滿樂趣！</p>
      </div>
      
      <div>
        <p className="text-primary">頁面內容將在此處顯示。</p>
      </div>

      <footer className="mt-12 text-center text-sm text-foreground/60">
        <p>© 2025 南梓實小虛擬銀行, 版權所有。</p>
      </footer>
    </main>
  );
}

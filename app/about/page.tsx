import React from 'react'

export default function page() {
  return (
    <div className='bg-gradient-to-b from-white to-orange-50 min-h-screen flex items-center justify-center font-sans'>
    <main className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg text-center">
        <h1 className="text-xl font-bold mb-3 text-gray-800">おみくじアプリ 💫</h1>
        <p className="text-gray-500 mb-5">スマホでもPCでもコピペで使えるHTML1ファイルだよ〜。気持ちを込めてボタン押してみて！</p>

        <button id="draw" aria-label="おみくじをひく" className="bg-gradient-to-r from-pink-500 to-rose-400 text-white px-5 py-3 rounded-xl font-bold shadow-md active:translate-y-0.5 disabled:opacity-50">おみくじをひく</button>

        <div id="result" className="mt-6" aria-live="polite">
        <div id="omikujiBox" className="p-4 rounded-xl border border-orange-100 bg-gradient-to-b from-white to-orange-50 shadow-sm">
        <div id="rank" className="text-2xl font-extrabold">ここを押して運試し</div>
        <div id="message" className="mt-2 text-gray-700">ラッキーアイテムとか一言メッセージがここにでるよ。</div>
        </div>
        </div>

        <div className="text-xs text-gray-400 mt-4">ヒント：結果はランダム。配列から好きに文章を追加してカスタムしてちょ。</div>
    </main>
    </div>
    
  )
}

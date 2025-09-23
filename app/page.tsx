import Image from "next/image";
import Header from "./Header";

export default function Home() {
  return (
    <div className="h-screen">
      <Header />
      <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-16 sm:p-20">
        <main className="flex flex-col gap-[32px] row-start-2 items-center justify-center">
          <Image
            className="dark:invert ml-4"
            src="/next.svg"
            alt="Next.js logo"
            width={180}
            height={38}
            priority
          />
          <ol className="font-mono list-inside list-none text-sm/6 text-center sm:text-left ">
            <li className="mb-2 tracking-[-.01em]">
            録音をしてみよう
            </li>
          </ol>

          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <a
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className="dark:invert items-center"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={20}
                height={20}
              />
              Recording now
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}

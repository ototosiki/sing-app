import Image from "next/image";
import Header from "./Header";
import Recorder from "./components/Recorder";

export default function Home() {
  return (
    <div className="h-screen">
      <Header />
      <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-16 sm:p-20">
        <main className="flex flex-col gap-[24px] row-start-2 items-center justify-center">
          <a href="./about">shota</a>
          <ol className="font-mono list-inside list-none text-sm/6 text-center sm:text-left ">
            <li className="mb-2 tracking-[-.01em]"></li>
          </ol>
          <Recorder />
        </main>
      </div>
    </div>
  );
}

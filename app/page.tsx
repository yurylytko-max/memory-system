import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-3xl font-bold mb-8">Система памяти</h1>

      <div className="grid grid-cols-2 gap-6">

        <Link href="/planner" className="block">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl hover:scale-[1.02] transition cursor-pointer">
            <h2 className="text-xl font-semibold">Планировщик</h2>
            <p className="text-gray-500">Задачи и дедлайны</p>
          </div>
        </Link>

        <Link href="/cards" className="block">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl hover:scale-[1.02] transition cursor-pointer">
            <h2 className="text-xl font-semibold">База знаний</h2>
            <p className="text-gray-500">Карточки и теги</p>
          </div>
        </Link>

        <Link href="/cards/new" className="block">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl hover:scale-[1.02] transition cursor-pointer">
            <h2 className="text-xl font-semibold">Новая карточка</h2>
            <p className="text-gray-500">Создать элемент знания</p>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold">Писательское пространство</h2>
          <p className="text-gray-500">Писать и соединять идеи</p>
        </div>

      </div>
    </main>
  );
}
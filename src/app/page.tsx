export default function HomePage() {
  return (
    <div className='mx-auto my-16 max-w-sm rounded bg-white p-8 text-gray-700 shadow-lg'>
      <form action='/description' method='get'>
        <label className='block'>
          <span>Emri dhe Mbiemri</span>
          <input
            name='name'
            type='text'
            required
            className='mt-1 block w-full'
            autoComplete='off'
            autoCorrect='off'
          />
        </label>
        <label className='mt-4 block'>
          <span>ID</span>
          <input
            name='id'
            type='text'
            required
            className='mt-1 block w-full'
            autoComplete='off'
            autoCorrect='off'
          />
        </label>
        <input
          type='submit'
          value='Hap Detyrën'
          className='mt-6 block w-full rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600'
        />
      </form>
    </div>
  );
}

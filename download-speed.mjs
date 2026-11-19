import { performance } from 'node:perf_hooks';

const REQUEST_COUNT = 10;
const TIMEOUT_MS = 120_000;

async function main() {
  const [address, ...extra] = process.argv.slice(2);

  if (!address || extra.length > 0) {
    throw new Error('Использование: node download-speed.mjs <URL>');
  }

  const url = new URL(address);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Адрес должен использовать HTTP или HTTPS.');
  }

  let totalBytes = 0;
  let totalMilliseconds = 0;

  for (let index = 0; index < REQUEST_COUNT; index++) {
    const start = performance.now();
    try {
      const response = await fetch(url, {
        headers: { 'Accept-Encoding': 'identity' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      // Читаем поток до конца, не сохраняя весь файл в памяти.
      let bytes = 0;
      if (response.body) {
        for await (const chunk of response.body) {
          bytes += chunk.byteLength;
        }
      }

      const milliseconds = performance.now() - start;
      totalBytes += bytes;
      totalMilliseconds += milliseconds;
      console.log(`Запрос ${index + 1}/${REQUEST_COUNT}: ${milliseconds.toFixed(2)} мс, ${bytes} байт`);
    } catch (error) {
      throw new Error(`Запрос ${index + 1}/${REQUEST_COUNT}: ${error.message}`, { cause: error });
    }
  }

  const speed = totalBytes / (1024 * 1024) / (totalMilliseconds / 1000);
  console.log(`\nСреднее время запроса: ${(totalMilliseconds / REQUEST_COUNT).toFixed(2)} мс`);
  console.log(`Общий объём: ${totalBytes} байт (${(totalBytes / (1024 * 1024)).toFixed(2)} МиБ)`);
  console.log(`Скорость скачивания: ${speed.toFixed(2)} МиБ/с`);
}

main().catch((error) => {
  console.error(`Ошибка: ${error.message}`);
  process.exitCode = 1;
});

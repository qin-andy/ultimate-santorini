import app from './app';

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// Heap usage tracking
let options = { hour: "numeric", minute: "numeric", seconds: "numeric" };
setInterval(() => {
  let used = process.memoryUsage().heapUsed / 1024 / 1024;
  let date = new Intl.DateTimeFormat("en-US", options as unknown as any).format(Date.now());
  console.log(`${date}: Heap used: ${Math.round(used * 100) / 100} MB`);
}, 5000);
import app from './app';

const port = process.env.PORT || 3001;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // TODO : sign certificate on other end

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
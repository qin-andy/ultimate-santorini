import request from 'supertest';
import app from '../src/app';


describe('routes', () => {
  it('get / hello world', done => {
    request(app)
      .get("/")
      .expect(200)
      .expect("Hello, world!", done);
  });
});
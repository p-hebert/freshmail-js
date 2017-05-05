class ExtendableError extends Error {
  constructor(message, payload) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    this.payload = payload || null;
    if(typeof Error.captureStackTrace === 'function'){
      Error.captureStackTrace(this, this.constructor);
    }else{
      this.stack = (new Error(message)).stack;
    }
  }
}

export default ExtendableError;

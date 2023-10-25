class HttpErrorModel extends Error {
    constructor(message, errorCode) {
        super(message)
        this.code = errorCode
    }
}

module.exports = HttpErrorModel
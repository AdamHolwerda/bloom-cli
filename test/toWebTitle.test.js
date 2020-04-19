const chai = require('chai');
const expect = chai.expect;

const toWebTitle = require('../dist/funcs/toWebTitle');

describe('Converts a title to a web title', () => {
    it('converts a title to a web title', () => {
        const a = toWebTitle('This Is A Title That Should Become A Web Title');
        expect(a).to.equal(
            'this-is-a-title-that-should-become-a-web-titlef8089122be5b4236ffa00655f2c5a8c1'
        );
    });
});

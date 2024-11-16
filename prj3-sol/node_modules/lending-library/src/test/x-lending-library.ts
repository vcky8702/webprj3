//will run the project DAO using an in-memory mongodb server
import { LendingLibrary, makeLendingLibrary } from '../lib/lending-library.js';
import { MemDao, makeMemDao } from './mem-dao.js';

import { LibraryDao, } from '../lib/library-dao.js';

import * as Lib from '../lib/library.js';

import { BOOKS, } from './test-data.js';

import { assert, expect } from 'chai';


//use assert(result.isOk === true) and assert(result.isOk === false)
//to ensure that typescript narrows result correctly


describe('extra lending library tests', () => {

  let memDao : MemDao;
  let library: LendingLibrary;
  
  beforeEach(async function () {
    const daoResult = await makeMemDao();
    assert(daoResult.isOk === true);
    memDao = daoResult.val;
    library = makeLendingLibrary(memDao.dao);
  });

  //mocha runs this after each test; we use this to clean up the DAO.
  afterEach(async function () {
    await memDao.tearDown();
  });


  describe('addBook()', () => {

    const NUMERIC_FIELDS = [ 'pages', 'year', 'nCopies' ];

    it('must catch bad isbn', async () => {
      const book = BOOKS[0];
      const book1: Record<string, any> = { ...book };
      book1.isbn += 'x';
      const bookResult = await library.addBook(book1);
      assert(bookResult.isOk === false);
      expect(bookResult.errors.length).to.be.gt(0);
    });

    it('must catch bad pages == 0', async () => {
      const book = BOOKS[0];
      const book1: Record<string, any> = { ...book };
      book1.pages = 0;
      const bookResult = await library.addBook(book1);
      assert(bookResult.isOk === false);
      expect(bookResult.errors.length).to.be.gt(0);
    });

    it('must catch bad year before Big-G', async () => {
      const book = BOOKS[0];
      const book1: Record<string, any> = { ...book };
      book1.year = 1400;
      const bookResult = await library.addBook(book1);
      assert(bookResult.isOk === false);
      expect(bookResult.errors.length).to.be.gt(0);
    });


    it('must catch empty author name', async () => {
      const book = BOOKS[0];
      const book1 = { ...book };
      book1.authors = [ ...book1.authors, '' ];
      const bookResult = await library.addBook(book1);
      assert(bookResult.isOk === false);
      expect(bookResult.errors.length).to.be.gt(0);
    });

  });  //describe('addBooks()', ...)



  describe('checkout and return books', async () => {

    beforeEach(async () => {
      for (const book of BOOKS) {
	const bookResult = await library.addBook(book);
	assert(bookResult.isOk === true);
      }
    });


    it('must allow interspersed checkout/return of books', async () => {
      const N_BOOKS = BOOKS.length;
      const MAX_CHECKOUTS = 30;
      const checkouts: Record<string, string> = {};
      let nCheckouts = 0;
      while (nCheckouts < MAX_CHECKOUTS) {
	const nRemaining = MAX_CHECKOUTS - nCheckouts;
	const nCheckoutsBatch =
	  Math.min(nRemaining, Math.floor(Math.random()*3 + 1));
	assert(nCheckoutsBatch > 0);
	for (let j = 0; j < nCheckoutsBatch; j++) {
	  const isbn = BOOKS[nCheckouts % BOOKS.length].isbn;
	  const patronId = PATRONS[nCheckouts % PATRONS.length];
	  const checkoutResult = await library.checkoutBook({patronId, isbn});
	  assert(checkoutResult.isOk === true);
	  checkouts[isbn] = patronId;
	  nCheckouts += 1;
	}
	const isbns = Object.keys(checkouts);
	assert(isbns.length > 0);
	const nReturns = Math.floor(Math.random()*isbns.length);
	for (const isbn of isbns.toReversed().slice(-1, -1 - nReturns)) {
	  const patronId = checkouts[isbn];
	  delete checkouts[isbn];
	  const returnResult = await library.returnBook({patronId, isbn});
	  assert(returnResult.isOk === true);
	}
      }
      //return all checked out books
      for (const [isbn, patronId] of Object.entries(checkouts)) {
	const returnResult = await library.returnBook({patronId, isbn});
	assert(returnResult.isOk === true);
      }
    });

  });    

});

const PATRONS = [ 'joe', 'sue', 'ann' ];


function findLangBooks(books: (typeof BOOKS[0])[], lang: string) {
  return books.filter(b => b.title.toLowerCase().includes(lang))!
    .sort((b1, b2) => b1.title.localeCompare(b2.title));
}

const LANG_BOOKS: Record<string, (typeof BOOKS[0])[]> = {
  javascript: findLangBooks(BOOKS, 'javascript'),
  ruby: findLangBooks(BOOKS, 'ruby'),
  scala: findLangBooks(BOOKS, 'scala'),
}

const BOOK_nCopies1 = BOOKS.find(b => b.nCopies === 1)!;
const BOOK_nCopies2 = BOOKS.find(b => b.nCopies === 2)!;
const BOOK_nCopies3 = BOOKS.find(b => b.nCopies === 3)!;

assert(BOOK_nCopies1, 'no book with # of copies === 1');
assert(BOOK_nCopies2, 'no book with # of copies === 2');
assert(BOOK_nCopies3, 'no book with # of copies === 3');


const CURL = 'curl';

const URL = 'https://localhost:2345';

export default [
  { comment: `
      # Assume server started earlier with many books preloaded using command:
      # ./dist/index.js config.mjs ~/cs544/data/books.json 
    `,
  },

  { comment: `
      # search for books on JavaScript
      #
      # curl options:
      #  -s:  silent, avoids progress indicators
      #  -k:  accept self-signed certificates
      #  -D /dev/stderr: print response headers on stderr
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books?search=JavaScript` ],
    ],
    setEnv: { isbn: 'result/0/result/isbn' },
  },

  { comment: `
      # Use isbn '$[isbn]' from first of previous results to directly
      # access same book without doing a search.
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books/$[isbn]` ],
    ],
  },

  { comment: `
      # Use invalid isbn '$[isbn]x' from to show result when accessing
      # a non-existent book.
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books/$[isbn]x` ],
    ],
  },

  { comment: `
      # search for books on JavaScript by Flanagan
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books?search=JavaScript+Flanagan` ],
    ],
  },

  { comment: `
      # search for books by 'SomeAuthor' (should return no books)
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books?search=SomeAuthor` ],
    ],
  },

  { comment: `
      # show contents of books/book1.json file.
    `,
    command: 'cat',
    args: [ [ 'books/book1.json' ] ],
    fakeJson: false,
  },


  { comment: `
      # add book using data from books/book1.json
      #
      # curl options:
      #  -H HEADER: send HTTP request header HEADER
      #  -d @FILE: send HTTP request body from FILE (induces POST method)
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', '-d', '@books/book1.json', ],
      [ `${URL}/api/books` ],
    ],
  },
  
  { comment: `
      # search again for books by 'SomeAuthor' 
      # (should return newly added book)
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books?search=SomeAuthor` ],
    ],
    setEnv: { isbn: 'result/0/result/isbn' },
  },

  { comment: `
      # Use isbn '$[isbn]' from previous result to directly access
      # same book without doing a search.
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books/$[isbn]` ],
    ],
  },

  { comment: `
      # attempt to add book using data from books/book1.json once again
      # (additional copies added)
      #
      # curl options:
      #  -H HEADER: send HTTP request header HEADER
      #  -d @FILE: send HTTP request body from FILE (induces POST method)
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', '-d', '@books/book1.json', ],
      [ `${URL}/api/books` ],
    ],
  },
  
  { comment: `
      # show contents of books/book2.json file (identical to book1.json,
        but a different edition)
    `,
    command: 'cat',
    args: [ [ 'books/book2.json' ] ],
    fakeJson: false,
  },


  { comment: `
      # attempt to add book using data from books/book2.json once again;
      # expect BAD_REQUEST since the ISBN is the same as book1 but the
      # title is different.
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', '-d', '@books/book2.json', ],
      [ `${URL}/api/books` ],
    ],
  },
  
  

  { comment: `
      # Retrieve all books on 'JavaScript'
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books?search=JavaScript&count=999999` ],
    ],
  },

  { comment: `
      # Retrieve first page of results for  books on 'JavaScript'
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books?search=JavaScript` ],
    ],
    setEnv: { next1: 'links/next/href' },
  },


  { comment: `
      # use next link '$[next1]'
      # from previous command to retrieve next page of results
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}$[next1]` ],
    ],
    setEnv: { prev1: 'links/prev/href' },
  },

  { comment: `
      # use prev link '$[prev1]'
      # from previous command to retrieve previous page of results
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}$[prev1]` ],
    ],
  },
  
  { comment: `
      # Retrieve intermediate page of books of results for
      # 'JavaScript' books
    `,
    command: CURL,
    args: [
      `-s -k -D -`.split(/\s+/),
      [ `${URL}/api/books?search=JavaScript&index=2&count=2` ],
    ],
    setEnv: { next1: 'links/next/href',
	      isbn1: 'result/0/result/isbn',
	      isbn2: 'result/1/result/isbn',
	    },
  },

  { comment: `
      Patron john checks out book $[isbn2]
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', ],
      [ '-d', '{"patronId": "john", "isbn": "$[isbn2]"}', ],
      [ `${URL}/api/lendings` ],
    ],
  },

  { comment: `
      Patron john attempts to check out book $[isbn2] again
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', ],
      [ '-d', '{"patronId": "john", "isbn": "$[isbn2]"}', ],
      [ `${URL}/api/lendings` ],
    ],
  },

  { comment: `
      Patron john returns book $[isbn1] which he does not have checked out
    `,
    command: CURL,
    args: [
      `-s -k -X DELETE -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', ],
      [ '-d', '{"patronId": "john", "isbn": "$[isbn1]"}', ],
      [ `${URL}/api/lendings` ],
    ],
  },

  { comment: `
      Patron sue checks out second copy of book $[isbn2]
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', ],
      [ '-d', '{"patronId": "sue", "isbn": "$[isbn2]"}',  ],
      [ `${URL}/api/lendings` ],
    ],
  },

  { comment: `
      Patron jane checks out book $[isbn2], but there are no copies left
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', ],
      [ '-d', '{"patronId": "jane", "isbn": "$[isbn2]"}', ],
      [ `${URL}/api/lendings` ],
    ],
  },

  { comment: `
      Patron john returns book $[isbn2] which he does have checked out
    `,
    command: CURL,
    args: [
      `-s -k -X DELETE -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', ],
      [ '-d', '{"patronId": "john", "isbn": "$[isbn2]"}', ],
      [ `${URL}/api/lendings` ],
    ],
  },

  { comment: `
      Patron jane checks out book $[isbn2], which is successful after
      the return by john
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', ],
      [ '-d', '{"patronId": "jane", "isbn": "$[isbn2]"}', ],
      [ `${URL}/api/lendings` ],
    ],
  },

  { comment: `
      #### Various errors ####
    `,
  },

  { comment: `
      # show contents of books/missing-required.json file.
    `,
    command: 'cat',
    args: [ [ 'books/missing-required.json' ] ],
    fakeJson: false,
  },

  { comment: `
      # attempt to add book from books/missing-required.json
      # (expect BAD_REQUEST)
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json',
       '-d', '@books/missing-required.json', ],
      [ `${URL}/api/books` ],
    ],
  },
  
  { comment: `
      # show contents of books/bad-types.json file.
    `,
    command: 'cat',
    args: [ [ 'books/bad-types.json' ] ],
    fakeJson: false,
  },

  { comment: `
      # attempt to create user using data from books/bad-types.json
      # (expect BAD_REQUEST)
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json',
       '-d', '@books/bad-types.json', ],
      [ `${URL}/api/books` ],
    ],
  },
  
  { comment: `
      # attempt to create book using json with syntax error
      # (expect BAD_REQUEST)
    `,
    command: CURL,
    args: [
      `-s -k -X PUT -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json',
       '-d', '{"isbn":}', ],
      [ `${URL}/api/books` ],
    ],
  },
  
  { comment: `
      # add book using data from books/book1.json, but use wrong
      # POST method; expect a 404
      #
      # curl options:
      #  -H HEADER: send HTTP request header HEADER
      #  -d @FILE: send HTTP request body from FILE (induces POST method)
    `,
    command: CURL,
    args: [
      `-s -k -X POST -D -`.split(/\s+/),
      ['-H', 'Content-Type: application/json', '-d', '@books/book1.json', ],
      [ `${URL}/api/books` ],
    ],
  },
  
];

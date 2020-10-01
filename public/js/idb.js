// create variable to hold db connection
let db;

// establish a connection to indexedDB database (connect to db if there is on, otherwise create one)
const request = indexedDB.open('budget_tracker', 1);

// event will emit if database version changes
request.onupgradeneeded = function(event) {
    // save reference to the db
    const db = event.target.result;
    // create an object store (table) called 'new_transaction', set it to have auto incrementing key
    db.createObjectStore('new_transaction', { autoIncrement: true });
};

// upon successful request
request.onsuccess = function(event) {
    // when db successfully created or established connection, save reference to db in global variable
    db = event.target.result;
    // check if app is online, if yes run uploadTransaction() to send all local db data to api
    if (navigator.onLine) {
        uploadTransaction();
    }
};

request.onerror = function(event) {
    // log error here
    console.log(event.target.errorCode);
};

// function to be executed if we attempt to submit transaction (temporary connection to db) and there's no internet connection
// ** saveRecord() will be used in index.js form submission function if the fetch() function's .catch() method is executed (.catch() is only executed on network failure)
function saveRecord(record) {
    // open new transaction with the db with read and write permissions
    const transaction = db.transaction(['new_transaction'], 'readwrite');
    // access the object store for 'new_transaction'
    const transactionObjectStore = transaction.objectStore('new_transaction');
    // add record to your store with add method
    transactionObjectStore.add(record);
};

// function that will handle collecting all of the data from the new_transaction object store in indexedDB and POST it to the server
function uploadTransaction() {
    // open transaction (connection) on your db
    const transaction = db.transaction(['new_transaction'], 'readwrite');
    // access your object store
    const transactionObjectStore = transaction.objectStore('new_transaction');
    // get all records from store and set to variable
    const getAll = transactionObjectStore.getAll();
    // upon successfull .getAll() execution, run this function
    getAll.onsuccess = function() {
        // if there's data in indexedDB's store, send it to api
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(serverResponse => {
                if (serverResponse.message) {
                    throw new Error(serverResponse);
                }
                // open one more transaction
                const transaction = db.transaction(['new_transaction'], 'readwrite');
                // access new_transaction object store
                const transactionObjectStore = transaction.objectStore('new_transaction');
                // clear all items in your store
                transactionObjectStore.clear();

                alert('All saved transactions have been submitted!');
            })
            .catch(err => {
                console.log(err);
            });
        }
    }
};

// listen for app coming back online
window.addEventListener('online', uploadTransaction);
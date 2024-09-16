import express from "express";
import ejs from "ejs";
import pg from "pg";
import bodyParser from "body-parser";
import axios from "axios";

const port = 3000;
const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
  user: "postgres",
  password: "110594",
  database: "BookDb",
  host: "localhost",
  port: 1154,
});

db.connect();

app.get("/", async (req, res) => {
  const sort = req.query.sort || "recent"; // sorting by recency

  // query based on the sorting method
  let query;
  if (sort === "rating") {
    query = "SELECT * FROM bookstable ORDER BY rating DESC"; // Sort by rating
  } else {
    query = "SELECT * FROM bookstable ORDER BY date_read DESC"; // sort by recency
  }

  try {
    const result = await db.query(query);
    const books = result.rows; // Fetch the books from the table
    res.render("index", {
      books: books, // Pass books to MY ejs
      sort: sort,   // Pass sort to manage the dropdown selection
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).send("Error fetching books");
  }
});

app.get("/new", (req, res) => {
    res.render("new");
});

app.post("/book", async (req, res) => {
    try {
        const { title, author, isbn, rating, review, date_read } = req.body;
        let coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        try {
            const response = await axios.get(coverUrl);
            if (response.status !== 200) {
                // if the cover is not found, set a fallback image URL
                coverUrl = 'https://covers.openlibrary.org/b/isbn/9780199232765-S.jpg';
            }
        } catch (error) {
            // if there's an error (e.g. API down), use the fallback image
            console.log('Error fetching cover:', error.message);
            coverUrl = 'https://covers.openlibrary.org/b/isbn/9780199232765-S.jpg';  // Replace with your default image path
        }

        // Now, i book details are inserted along with the cover URL into the database
        await db.query(
            "INSERT INTO bookstable (title, author, isbn, cover_url, rating, review, date_read) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [title, author, isbn, coverUrl, rating, review, date_read]
        );

        // Redirect to the homepage
        res.redirect('/');

    } catch (error) {
        console.error('Error inserting book:', error.message);
        res.status(500).send('Server error');
    }
});

app.get("/book/:id/edit", async(req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM bookstable WHERE id = $1", [id]);
        if (result.rows.length === 0) {
           return res.status(404).send("Book not found");
        }
        const book = result.rows[0];
        res.render("edit", { book });
    } catch (error) {
        console.error("Error fetching book details: ", error);
        res.status(505).send("Server Error");

    }
});

app.post("/edit", async (req, res) => {
    const { id, title, author, isbn, rating, review, date_read } = req.body;
    // const cover_url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`; //
    try {
        await db.query("UPDATE bookstable SET title = $2, author = $3, isbn = $4, rating = $5, review = $6, date_read = $7 WHERE id = $1", [id, title, author, isbn, rating, review, date_read]);
        res.redirect('/');
    } catch (error) {
        console.error('Error updating book:', error);
        res.status(500).send('Server error');
    }
});

app.post("/delete", async (req, res) => {
    const { deleteBookId } = req.body;
    try {
        await db.query('DELETE FROM bookstable WHERE id = $1', [deleteBookId]);
        res.redirect('/');
    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).send('Server error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

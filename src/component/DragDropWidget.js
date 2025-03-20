"use client";

import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

export default function Widget() {
  const [context, setContext] = useState(null);
  const [items, setItems] = useState([]);
  const [draggedFile, setDraggedFile] = useState(null);

  useEffect(() => {
    monday.listen("context", (res) => {
      console.log("Context Data:", res.data);
      setContext(res.data);
    });
  }, []);

  useEffect(() => {
    if (context?.boardId) {
      monday
        .api(`
        query {
          boards(ids: ${context.boardId}) {
            id
            name
            items_page {
              items {
                id
                name
                column_values {
                  id
                  text
                }
              }
            }
          }
        }
      `)
        .then((res) => {
          console.log("Fetched board data:", res.data);
          if (res.data?.boards?.length) {
            setContext((prev) => ({ ...prev, boardName: res.data.boards[0].name }));
            setItems(res.data.boards[0].items_page.items);
          }
        })
        .catch((err) => console.error("Error fetching board items:", err));
    }
  }, [context?.boardId]);

  // Start Drag
  const handleDragStart = (file, columnId, itemId) => {
    setDraggedFile({ file, columnId, itemId });
  };

  // Drop into an existing column
  const handleDrop = async (targetColumnId, itemId) => {
    if (!draggedFile || !context?.boardId) return;

    // Update Monday.com API
    await monday.api(`
      mutation {
        change_column_value(
          board_id: ${context.boardId}, 
          item_id: ${itemId}, 
          column_id: "${targetColumnId}", 
          value: "{\\"file\\": \\"${draggedFile.file}\\"}"
        ) {
          id
        }
      }
    `);

    // Update UI by moving the file
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              column_values: item.column_values.map((col) =>
                col.id === draggedFile.columnId
                  ? { ...col, text: "" } // Remove from old column
                  : col.id === targetColumnId
                  ? { ...col, text: draggedFile.file } // Add to new column
                  : col
              ),
            }
          : item
      )
    );

    setDraggedFile(null);
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg w-full">
      <h1 className="text-lg text-yellow-300 font-bold">Monday.com Table Drag & Drop</h1>
      <p className="text-gray-600">Board: {context?.boardName || "Loading..."}</p>

      <table className="min-w-full bg-white border mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Item Name</th>
            <th className="border p-2">Column A</th>
            <th className="border p-2">Column B</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border">
              <td className="border p-2">{item.name}</td>

              {/* Column A - Drag Source & Drop Target */}
              <td
                className="border p-2 min-h-[50px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop("column_a_id", item.id)}
              >
                {item.column_values
                  .filter((col) => col.id === "column_a_id" && col.text)
                  .map((file) => (
                    <div
                      key={file.id}
                      draggable
                      onDragStart={() => handleDragStart(file.text, "column_a_id", item.id)}
                      className="p-2 bg-blue-100 shadow-md rounded-md cursor-pointer"
                    >
                      📄 {file.text}
                    </div>
                  ))}
              </td>

              {/* Column B - Drag Source & Drop Target */}
              <td
                className="border p-2 min-h-[50px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop("column_b_id", item.id)}
              >
                {item.column_values
                  .filter((col) => col.id === "column_b_id" && col.text)
                  .map((file) => (
                    <div
                      key={file.id}
                      draggable
                      onDragStart={() => handleDragStart(file.text, "column_b_id", item.id)}
                      className="p-2 bg-green-100 shadow-md rounded-md cursor-pointer"
                    >
                      📄 {file.text}
                    </div>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

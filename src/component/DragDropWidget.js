"use client";

import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

export default function DragDropWidget() {
  const [context, setContext] = useState(null);
  const [items, setItems] = useState([]);
  const [draggedFile, setDraggedFile] = useState(null);

  useEffect(() => {
    monday.listen("context", (res) => {
      setContext(res.data);
    });
  }, []);

  useEffect(() => {
    if (context?.boardId) {
      monday.api(`
        query {
          boards(ids: ${context.boardId}) {
            name 
            items {
              id 
              name 
              column_values {
                id 
                text 
                value
              }
            }
          }
        }
      `).then((res) => {
        setItems(res.data.boards[0].items);
      });
    }
  }, [context]);

  const handleDragStart = (file) => {
    setDraggedFile(file);
  };

  const handleDrop = async (targetGroup) => {
    if (!draggedFile || !context?.boardId) return;

    // Simulate moving file to another column (update Monday.com)
    await monday.api(`
      mutation {
        change_column_value(
          board_id: ${context.boardId}, 
          item_id: ${draggedFile.itemId}, 
          column_id: "file_column_id", 
          value: "{\\"group\\": \\"${targetGroup}\\"}"
        ) {
          id
        }
      }
    `);

    // Update UI
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === draggedFile.itemId ? { ...item, group: targetGroup } : item
      )
    );

    setDraggedFile(null);
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg w-full">
      <h1 className="text-lg text-yellow-300 font-bold">Monday.com File Drag & Drop</h1>
      <p className="text-gray-600">Board: {context?.boardName || "Loading..."}</p>

      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Column 1: Uploaded Files */}
        <div
          className="p-4 bg-gray-100 rounded-md min-h-[200px]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop("Uploaded")}
        >
          <h2 className="text-md font-bold">Uploaded Files</h2>
          {items
            .filter((item) => !item.group || item.group === "Uploaded")
            .map((item) =>
              item.column_values
                .filter((col) => col.id === "file_column_id" && col.value)
                .map((file) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={() =>
                      handleDragStart({ itemId: item.id, fileName: file.text })
                    }
                    className="p-2 bg-white shadow-md rounded-md mt-2 cursor-pointer"
                  >
                    📄 {file.text}
                  </div>
                ))
            )}
        </div>

        {/* Column 2: Processed Files */}
        <div
          className="p-4 bg-gray-200 rounded-md min-h-[200px]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop("Processed")}
        >
          <h2 className="text-md font-bold">Processed Files</h2>
          {items
            .filter((item) => item.group === "Processed")
            .map((item) =>
              item.column_values
                .filter((col) => col.id === "file_column_id" && col.value)
                .map((file) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={() =>
                      handleDragStart({ itemId: item.id, fileName: file.text })
                    }
                    className="p-2 bg-white shadow-md rounded-md mt-2 cursor-pointer"
                  >
                    📄 {file.text}
                  </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}

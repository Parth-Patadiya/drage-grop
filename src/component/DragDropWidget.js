import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

export default function Widget() {
  const [context, setContext] = useState(null);
  const [items, setItems] = useState([]);
  const [draggedFile, setDraggedFile] = useState(null);
  const [columns, setColumns] = useState({});

  useEffect(() => {
    monday.listen("context", (res) => {
      console.log("Context Data:", res.data);
      setContext(res.data);
    });
  }, []);

  useEffect(() => {
    if (context?.boardId) {
      fetchBoardData(context.boardId);
    }
  }, [context?.boardId]);

  // Fetch board details including columns and items
  const fetchBoardData = async (boardId) => {
    try {
      const res = await monday.api(`
        query {
          boards(ids: ${boardId}) {
            id
            name
            columns { id title }
            items {
              id
              name
              column_values { id value }
            }
          }
        }
      `);

      const board = res.data?.boards[0];
      setContext((prev) => ({ ...prev, boardName: board?.name }));
      setColumns(
        board?.columns.reduce((acc, col) => ({ ...acc, [col.title]: col.id }), {})
      );
      setItems(board?.items || []);
    } catch (error) {
      console.error("Error fetching board data:", error);
    }
  };

  // Dragging starts
  const handleDragStart = (file, columnId, itemId) => {
    setDraggedFile({ file, columnId, itemId });
  };

  // Dropping file into another column
  const handleDrop = async (targetColumnId, itemId) => {
    if (!draggedFile || !context?.boardId) return;

    try {
      await monday.api(`
        mutation {
          change_column_value(
            board_id: ${context.boardId}, 
            item_id: ${itemId}, 
            column_id: "${targetColumnId}", 
            value: "{\\"file\\": \\\"${draggedFile.file}\\\"}"
          ) {
            id
          }
        }
      `);

      // Update UI after dropping
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                column_values: item.column_values.map((col) =>
                  col.id === targetColumnId
                    ? { ...col, value: draggedFile.file }
                    : col
                ),
              }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating file:", error);
    }
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
            {Object.keys(columns).map((colTitle) => (
              <th key={columns[colTitle]} className="border p-2">{colTitle}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border">
              <td className="border p-2">{item.name}</td>
              {Object.keys(columns).map((colTitle) => {
                const columnId = columns[colTitle];
                const file = item.column_values.find((col) => col.id === columnId)?.value;

                return (
                  <td
                    key={columnId}
                    className="border p-2 min-h-[50px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(columnId, item.id)}
                  >
                    {file ? (
                      <div
                        draggable
                        onDragStart={() => handleDragStart(file, columnId, item.id)}
                        className="p-2 bg-blue-100 shadow-md rounded-md cursor-pointer"
                      >
                        📄 {file}
                      </div>
                    ) : (
                      <span className="text-gray-400">Drop Here</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
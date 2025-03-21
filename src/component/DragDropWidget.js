import React, { useEffect, useState } from "react";
import mondaySdk from "@mondaycom/apps-sdk";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const monday = mondaySdk();
// Get current board ID
let BOARD_ID ; // Replace with Board ID
monday.api(`query { boards { id name } }`).then(res => {
  console.log(res.data);
  BOARD_ID = res.data;
});
const API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjQ4ODI0NTMzOCwiYWFpIjoxMSwidWlkIjo3MjIxMzc5OCwiaWFkIjoiMjAyNS0wMy0yMFQwOToyNDo0Ni4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjgwMjU1NzcsInJnbiI6ImFwc2UyIn0.q25qnryaCWmlHdCeVSxjMq7tIOQnhC-v_6nDlkMKWTg"; // Replace with Monday API Key

function App() {
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    async function fetchColumns() {
      const query = `
      query {
        boards(ids: [${BOARD_ID}]) {
          columns {
            id
            title
            settings_str
          }
          items {
            id
            name
            column_values {
              id
              title
              value
            }
          }
        }
      }`;

      try {
        const response = await axios.post(
          "https://api.monday.com/v2",
          { query },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: API_KEY,
            },
          }
        );

        const board = response.data.data.boards[0];
        const fileColumns = board.columns.filter(col => JSON.parse(col.settings_str)?.type === "file");

        let columnData = fileColumns.map(col => ({
          id: col.id,
          title: col.title,
          files: []
        }));

        board.items.forEach(item => {
          item.column_values.forEach(col => {
            const column = columnData.find(c => c.id === col.id);
            if (column && col.value) {
              try {
                const files = JSON.parse(col.value);
                column.files.push(...files.map(file => ({ ...file, itemId: item.id })));
              } catch (e) {}
            }
          });
        });

        setColumns(columnData);
      } catch (error) {
        console.error("Error fetching columns:", error);
      }
    }

    fetchColumns();
  }, []);

  async function updateFileColumn(file, sourceColumnId, destColumnId) {
    try {
      const mutation = `
      mutation {
        change_column_value(board_id: ${BOARD_ID}, item_id: ${file.itemId}, column_id: "${destColumnId}", value: "{\\"files\\":[{\\"url\\":\\"${file.url}\\",\\"name\\":\\"${file.name}\\"}]}" ) {
          id
        }
      }`;

      await axios.post(
        "https://api.monday.com/v2",
        { query: mutation },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: API_KEY,
          },
        }
      );

      setColumns(prevColumns => {
        const sourceColumn = prevColumns.find(col => col.id === sourceColumnId);
        const destColumn = prevColumns.find(col => col.id === destColumnId);
        if (sourceColumn && destColumn) {
          sourceColumn.files = sourceColumn.files.filter(f => f.url !== file.url);
          destColumn.files.push(file);
        }
        return [...prevColumns];
      });
    } catch (error) {
      console.error("Error updating column:", error);
    }
  }

  function handleDragEnd(result) {
    if (!result.destination) return;

    const sourceColumnId = result.source.droppableId;
    const destColumnId = result.destination.droppableId;
    const fileIndex = result.source.index;
    const sourceColumn = columns.find(col => col.id === sourceColumnId);
    const file = sourceColumn.files[fileIndex];

    if (sourceColumnId !== destColumnId) {
      updateFileColumn(file, sourceColumnId, destColumnId);
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Drag & Drop File Manager</h2>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: "flex", gap: "20px" }}>
          {columns.map(col => (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{ width: "250px", minHeight: "300px", padding: "10px", border: "1px solid black" }}
                >
                  <h3>{col.title}</h3>
                  {col.files.map((file, index) => (
                    <Draggable key={file.url} draggableId={file.url} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{ padding: "10px", margin: "5px", background: "#f0f0f0", border: "1px solid gray" }}
                        >
                          {file.name}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export default App;

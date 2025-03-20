import React, { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";
import { Card, CardContent } from "@/components/ui/card";

const monday = mondaySdk();

const DragDropWidget = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    monday.api(`query { boards(limit:1) { items { id, name, column_values { id, value, text } } } }`)
      .then(res => {
        setItems(res.data.boards[0].items);
      })
      .catch(err => console.error("Error fetching items:", err));
  }, []);

  const handleDragStart = (e, itemId, columnId) => {
    e.dataTransfer.setData("itemId", itemId);
    e.dataTransfer.setData("columnId", columnId);
  };

  const handleDrop = (e, newColumnId) => {
    const itemId = e.dataTransfer.getData("itemId");
    const oldColumnId = e.dataTransfer.getData("columnId");
    
    if (oldColumnId !== newColumnId) {
      monday.api(`mutation { change_column_value(board_id: 123456, item_id: ${itemId}, column_id: "${newColumnId}", value: "Moved") { id } }`)
        .then(() => {
          setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, column_values: item.column_values.map(col => col.id === newColumnId ? { ...col, text: "Moved" } : col) } : item));
        })
        .catch(err => console.error("Error updating column:", err));
    }
  };

  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      {items.map((item) => (
        <Card key={item.id} draggable onDragStart={(e) => handleDragStart(e, item.id, item.column_values[0].id)}>
          <CardContent className="p-2 cursor-grab">
            <p className="text-sm font-medium">{item.name}</p>
          </CardContent>
        </Card>
      ))}
      <div className="p-4 bg-gray-200 rounded-md" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "new_column_id")}>Drop Here</div>
    </div>
  );
};

export default DragDropWidget;
import React, { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

const DragDropWidget = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    monday.api(`query { boards(limit:1) { items { id, name, column_values { id, value, text } } } }`)
      .then(res => {
        setItems(res.data.boards[0].items);
        console.log(res.data);
        
      })
      .catch(err => console.error("Error fetching items:", err));
  }, []);

  const handleDragStart = (e, itemId, columnId) => {
    e.dataTransfer.setData("itemId", itemId);
    e.dataTransfer.setData("columnId", columnId);
  };

  const handleDrop = (e, newColumnId) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    const oldColumnId = e.dataTransfer.getData("columnId");
    
    if (oldColumnId !== newColumnId) {
      monday.api(`mutation { change_column_value(board_id: 123456, item_id: ${itemId}, column_id: "${newColumnId}", value: "Moved") { id } }`)
        .then(() => {
          setItems(prevItems => prevItems.map(item => 
            item.id === itemId ? { 
              ...item, 
              column_values: item.column_values.map(col => 
                col.id === newColumnId ? { ...col, text: "Moved" } : col
              )
            } : item
          ));
        })
        .catch(err => console.error("Error updating column:", err));
    }
  };

  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="border p-4 rounded-lg shadow cursor-grab" 
          draggable 
          onDragStart={(e) => handleDragStart(e, item.id, item.column_values[0].id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, item.column_values[0].id)}
        >
          <div className="p-2">
            <p className="text-sm font-medium">{item.name}</p>
          </div>
        </div>
      ))}
      <div 
        className="p-4 bg-gray-200 rounded-md" 
        onDragOver={(e) => e.preventDefault()} 
        onDrop={(e) => handleDrop(e, "new_column_id")}
      >
        Drop Here
      </div>
    </div>
  );
};

export default DragDropWidget;

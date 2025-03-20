import React, { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

const DragDropWidget = () => {
  const [items, setItems] = useState([]);
  const [boardId, setBoardId] = useState(null);

  useEffect(() => {
    monday.api(`
      query {
        boards(limit: 1) {
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
      .then(res => {
        const board = res.data.boards[0];
        if (board && board.items_page) {
          setBoardId(board.id);
          setItems(board.items_page.items);
        }
      })
      .catch(err => console.error("Error fetching items:", err));
  }, []);

  const handleDragStart = (e, itemId) => {
    e.dataTransfer.setData("itemId", itemId);
  };

  const handleDrop = (e, targetItemId) => {
    e.preventDefault();
    const draggedItemId = e.dataTransfer.getData("itemId");
    
    if (draggedItemId === targetItemId) return;
    
    // Reorder items in UI
    const updatedItems = [...items];
    const draggedItemIndex = updatedItems.findIndex(item => item.id === draggedItemId);
    const targetItemIndex = updatedItems.findIndex(item => item.id === targetItemId);
    
    if (draggedItemIndex !== -1 && targetItemIndex !== -1) {
      const [draggedItem] = updatedItems.splice(draggedItemIndex, 1);
      updatedItems.splice(targetItemIndex, 0, draggedItem);
      setItems(updatedItems);
    }

    // API call to sync new position on Monday.com
    if (boardId) {
      monday.api(`
        mutation {
          move_item_to_group (item_id: ${draggedItemId}, group_id: "${targetItemId}") {
            id
          }
        }
      `)
      .then(() => console.log("Item moved successfully!"))
      .catch(err => console.error("Error updating position:", err));
    }
  };

  return (
    <div className="p-4 grid grid-cols-1 gap-2">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="border p-4 rounded-lg shadow cursor-grab" 
          draggable 
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, item.id)}
        >
          <p className="text-sm font-medium">{item.name}</p>
        </div>
      ))}
    </div>
  );
};

export default DragDropWidget;
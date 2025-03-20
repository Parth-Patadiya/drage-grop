import React, { useState, useEffect } from "react";
import mondaySdk from "monday-sdk-js";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "./SortableItem";

const monday = mondaySdk();

const DragDropWidget = () => {
  const [boardData, setBoardData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);

  useEffect(() => {
    fetchBoardData();
  }, []);

  const fetchBoardData = async () => {
    monday.api(`query { boards(limit: 1) { id name columns { id title } items { id name column_values { id text } } } }`)
      .then((res) => {
        const board = res.data.boards[0];
        setSelectedBoardId(board.id);
        setColumns(board.columns);
        setBoardData(board.items);
      });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const updatedItems = boardData.map((item) => {
      if (item.id === active.id) {
        return { ...item, column_values: item.column_values.map(col => col.id === over.id ? { ...col, text: over.id } : col) };
      }
      return item;
    });

    setBoardData(updatedItems);

    await monday.api(`mutation { change_column_value (board_id: ${selectedBoardId}, item_id: ${active.id}, column_id: "${over.id}", value: "${over.id}") { id } }`);
  };

  return (
    <div className="p-4 w-full max-w-lg mx-auto">
      <h2 className="text-lg font-bold mb-4">Drag & Drop Files</h2>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={boardData.map(item => item.id)} strategy={verticalListSortingStrategy}>
          {boardData.map((item) => (
            <SortableItem key={item.id} id={item.id} name={item.name} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default DragDropWidget;

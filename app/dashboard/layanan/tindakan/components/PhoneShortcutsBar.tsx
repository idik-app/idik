"use client";

import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  type DropResult 
} from "@hello-pangea/dnd";
import { Phone, X, GripVertical } from "lucide-react";
import { usePhoneDirectory } from "../hooks/usePhoneDirectory";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function PhoneShortcutsBar({ themeTone }: { themeTone: "cyan" | "emerald" }) {
  const { pinnedItems, togglePin, reorderPins, isLoaded } = usePhoneDirectory();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(pinnedItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    void reorderPins(items);
  };

  if (!isLoaded || pinnedItems.length === 0) return null;

  return (
    <div className="mb-1 px-1">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="phone-shortcuts" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex flex-wrap items-center gap-2"
            >
              <div className="flex items-center gap-1.5 mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Phone className="h-3 w-3" />
                Shortcuts:
              </div>
              
              {pinnedItems.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "group relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all",
                        snapshot.isDragging 
                          ? "scale-105 shadow-xl ring-2 ring-cyan-500/50 z-50" 
                          : "shadow-sm",
                        themeTone === "emerald"
                          ? "bg-emerald-50/50 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/40"
                          : "bg-cyan-50/50 border-cyan-200/60 dark:bg-cyan-950/20 dark:border-cyan-800/40"
                      )}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-400"
                      >
                        <GripVertical className="h-3 w-3" />
                      </div>
                      
                      <div className="flex flex-col leading-none">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[80px]">
                          {item.unit}
                        </span>
                        <span className={cn(
                          "text-[9px] font-mono font-black",
                          themeTone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-cyan-600 dark:text-cyan-400"
                        )}>
                          ext: {item.ext}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          void togglePin(item.id);
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500"
                        title="Hapus dari shortcut"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

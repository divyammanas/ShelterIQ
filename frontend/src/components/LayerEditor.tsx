import React from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  type DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { type Layer, MaterialDatabase } from '../services/physicsEngine';

interface SortableLayerRowProps {
  id: string;
  idx: number;
  layer: Layer;
  onMaterialChange: (materialKey: string) => void;
  onThicknessChange: (thickness: number) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  mdb: MaterialDatabase;
}

const SortableLayerRow: React.FC<SortableLayerRowProps> = ({
  id,
  idx,
  layer,
  onMaterialChange,
  onThicknessChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  mdb
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto'
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl hover:shadow-sm transition-all duration-150"
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="text-zinc-400 dark:text-zinc-500 cursor-grab active:cursor-grabbing hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
      >
        <GripVertical size={16} />
      </div>

      {/* Index */}
      <div className="text-xs font-bold text-zinc-400 dark:text-zinc-500 w-6">
        #{idx + 1}
      </div>

      {/* Material Selector */}
      <div className="flex-1 min-w-[120px]">
        <select
          value={Object.keys(mdb.db).find(k => mdb.db[k].name === layer.material.name) || ''}
          onChange={(e) => onMaterialChange(e.target.value)}
          className="w-full bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
        >
          {Object.keys(mdb.db).map((key) => (
            <option key={key} value={key}>
              {mdb.db[key].name}
            </option>
          ))}
        </select>
      </div>

      {/* Thickness Input */}
      <div className="flex items-center gap-1.5 shrink-0 w-24">
        <input
          type="number"
          step="0.01"
          min="0.01"
          max="1.0"
          value={layer.thickness}
          onChange={(e) => onThicknessChange(parseFloat(e.target.value) || 0.01)}
          className="w-full text-right bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100 font-mono"
        />
        <span className="text-xs text-zinc-400 font-medium">m</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="Move Layer Up"
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 bg-white dark:bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="Move Layer Down"
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 bg-white dark:bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowDown size={14} />
        </button>
        <button
          onClick={onDelete}
          title="Delete Layer"
          className="p-1.5 rounded-lg border border-red-100 dark:border-red-950/20 text-red-500 hover:text-red-700 dark:hover:text-red-400 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export const LayerEditor: React.FC = () => {
  const {
    mdb,
    wallLayers,
    setWallLayers,
    roofLayers,
    setRoofLayers,
    floorLayers,
    setFloorLayers,
    runActiveSimulation
  } = useApp();

  const [activeTab, setActiveTab] = React.useState<'walls' | 'roof' | 'floor'>('walls');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getLayers = () => {
    if (activeTab === 'walls') return wallLayers;
    if (activeTab === 'roof') return roofLayers;
    return floorLayers;
  };

  const setLayers = (newLayers: Layer[] | ((prev: Layer[]) => Layer[])) => {
    if (activeTab === 'walls') {
      setWallLayers(newLayers);
    } else if (activeTab === 'roof') {
      setRoofLayers(newLayers);
    } else {
      setFloorLayers(newLayers);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const layers = getLayers();
    const oldIndex = layers.findIndex((_, idx) => `${activeTab}-layer-${idx}` === active.id);
    const newIndex = layers.findIndex((_, idx) => `${activeTab}-layer-${idx}` === over.id);

    const reordered = arrayMove(layers, oldIndex, newIndex);
    setLayers(reordered);
    setTimeout(() => runActiveSimulation(), 50);
  };

  const handleMaterialChange = (idx: number, materialKey: string) => {
    const layers = [...getLayers()];
    layers[idx].material = mdb.get(materialKey);
    setLayers(layers);
    setTimeout(() => runActiveSimulation(), 50);
  };

  const handleThicknessChange = (idx: number, thickness: number) => {
    const layers = [...getLayers()];
    layers[idx].thickness = Math.max(thickness, 0.01);
    setLayers(layers);
    setTimeout(() => runActiveSimulation(), 50);
  };

  const handleDelete = (idx: number) => {
    const layers = getLayers();
    if (layers.length <= 1) {
      alert("Must have at least one envelope layer.");
      return;
    }
    const filtered = layers.filter((_, i) => i !== idx);
    setLayers(filtered);
    setTimeout(() => runActiveSimulation(), 50);
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const layers = [...getLayers()];
    const temp = layers[idx];
    layers[idx] = layers[idx - 1];
    layers[idx - 1] = temp;
    setLayers(layers);
    setTimeout(() => runActiveSimulation(), 50);
  };

  const handleMoveDown = (idx: number) => {
    const layers = getLayers();
    if (idx >= layers.length - 1) return;
    const copied = [...layers];
    const temp = copied[idx];
    copied[idx] = copied[idx + 1];
    copied[idx + 1] = temp;
    setLayers(copied);
    setTimeout(() => runActiveSimulation(), 50);
  };

  const handleAddLayer = () => {
    const layers = [...getLayers()];
    layers.push({ material: mdb.get("brick_common"), thickness: 0.10 });
    setLayers(layers);
    setTimeout(() => runActiveSimulation(), 50);
  };

  const layers = getLayers();
  const totalThickness = layers.reduce((sum, l) => sum + l.thickness, 0);

  const getLayerSegmentColor = (layer: Layer) => {
    if (layer.material.k < 0.05) return 'bg-sky-600 dark:bg-sky-500';
    if (layer.material.is_pcm) return 'bg-teal-500 dark:bg-teal-400';
    if (layer.material.rho > 1800) return 'bg-zinc-700 dark:bg-zinc-600';
    return 'bg-amber-700 dark:bg-amber-600';
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Assembly tabs */}
      <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl w-fit self-start border border-zinc-200/50 dark:border-zinc-800/30">
        {(['walls', 'roof', 'floor'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all duration-150 ${
              activeTab === tab
                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Layers assembly order is listed from <strong>Outside (top)</strong> to <strong>Inside (bottom)</strong>. Drag items to reorder.
      </div>

      {/* Layers list */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={layers.map((_, idx) => `${activeTab}-layer-${idx}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {layers.map((layer, idx) => (
              <SortableLayerRow
                key={`${activeTab}-layer-${idx}`}
                id={`${activeTab}-layer-${idx}`}
                idx={idx}
                layer={layer}
                onMaterialChange={(key) => handleMaterialChange(idx, key)}
                onThicknessChange={(thick) => handleThicknessChange(idx, thick)}
                onDelete={() => handleDelete(idx)}
                onMoveUp={() => handleMoveUp(idx)}
                onMoveDown={() => handleMoveDown(idx)}
                isFirst={idx === 0}
                isLast={idx === layers.length - 1}
                mdb={mdb}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add layer button */}
      <button 
        onClick={handleAddLayer}
        className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all w-fit"
      >
        <Plus size={14} /> Add Layer
      </button>

      {/* Cross section preview */}
      <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-6">
        <h4 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
          Assembly Cross-Section Preview (Total: {totalThickness.toFixed(2)}m)
        </h4>
        <div className="flex h-10 w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner bg-zinc-100 dark:bg-zinc-900">
          {layers.map((layer, idx) => {
            const pct = (layer.thickness / (totalThickness || 1)) * 100;
            return (
              <div
                key={idx}
                style={{ width: `${pct}%` }}
                className={`${getLayerSegmentColor(layer)} h-full flex items-center justify-center text-[10px] text-white font-bold truncate px-2 relative group cursor-help transition-all duration-150`}
              >
                <span className="truncate">{layer.material.name}</span>
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-950/95 border border-zinc-800 text-white rounded-lg p-2 text-[10px] whitespace-nowrap shadow-xl z-50 pointer-events-none">
                  <div className="font-bold">{layer.material.name}</div>
                  <div>Thickness: {Math.round(layer.thickness * 100)}cm</div>
                  <div>k: {layer.material.k} W/mK</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

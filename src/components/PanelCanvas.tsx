import React, { useMemo, useRef, useState } from 'react';
import {
  PanelConfig,
  PanelModule,
  PortCoordinate,
  RailId,
  WireConnection,
  WireType,
} from '../types/panel';
import {
  calculateCircuitCurrent,
  getWireColorHex,
} from '../utils/electrical';

interface PanelCanvasProps {
  config: PanelConfig;
  selectedModuleId: string | null;
  onSelectModule: (id: string | null) => void;
  onToggleModulePower: (id: string) => void;
  onMoveModule: (moduleId: string, targetRail: RailId, targetSlot: number) => void;
  onDropCatalogItem: (catalogKey: string, targetRail: RailId, targetSlot: number) => void;
  wireToolActive: boolean;
  activeWireType: WireType;
  activeWireGauge: number;
  onAddWire: (fromId: string, fromPort: string, toId: string, toPort: string) => void;
  onDeleteWire: (wireId: string) => void;
  svgRef: React.RefObject<SVGSVGElement>;
}

const DIN_PITCH = 42; // 1 DIN pole width (px)
const MODULE_HEIGHT = 116; // Height of vertical DIN module (px)

export const PanelCanvas: React.FC<PanelCanvasProps> = ({
  config,
  selectedModuleId,
  onSelectModule,
  onToggleModulePower,
  onMoveModule,
  onDropCatalogItem,
  wireToolActive,
  activeWireType,
  onAddWire,
  onDeleteWire,
  svgRef,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [hoveredSlot, setHoveredSlot] = useState<{
    railId: RailId;
    slot: number;
    poles: number;
  } | null>(null);

  const [pointerDrag, setPointerDrag] = useState<{
    module: PanelModule;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    hasMoved: boolean;
  } | null>(null);

  const dragJustEndedRef = useRef(false);

  const [wireStartPort, setWireStartPort] = useState<PortCoordinate | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

  const canvasWidth =
    config.topology === 'horizontal'
      ? Math.max(1000, 200 + config.modulesPerRow * DIN_PITCH + 200)
      : 1000;
  const canvasHeight =
    config.topology === 'fishbone'
      ? Math.max(940, 380 + config.fishboneSlotsPerSide * DIN_PITCH + 120)
      : Math.max(960, 200 + config.horizontalRows * 250 + 100);

  const clientToSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvasWidth;
    const y = ((clientY - rect.top) / rect.height) * canvasHeight;
    return { x, y };
  };

  const hitTestRailSlot = (
    svgX: number,
    svgY: number,
    poles: number = 1
  ): { railId: RailId; slot: number; poles: number } | null => {
    if (config.topology === 'fishbone') {
      if (svgY >= 80 && svgY <= 280 && svgX >= 190 && svgX <= 790) {
        const rawSlot = Math.floor((svgX - 225) / DIN_PITCH);
        const slot = Math.max(0, Math.min(12 - poles, rawSlot));
        return { railId: 'top_main', slot, poles };
      }

      const verticalStartY = 360;
      const verticalEndY = verticalStartY + config.fishboneSlotsPerSide * DIN_PITCH + 40;
      if (svgY >= verticalStartY - 30 && svgY <= verticalEndY) {
        const rawSlot = Math.floor((svgY - verticalStartY) / DIN_PITCH);
        const slot = Math.max(
          0,
          Math.min(config.fishboneSlotsPerSide - poles, rawSlot)
        );
        if (svgX < 500) {
          return { railId: 'left_rail', slot, poles };
        } else {
          return { railId: 'right_rail', slot, poles };
        }
      }
      return null;
    } else {
      const rowIds: RailId[] = ['row_1', 'row_2', 'row_3', 'row_4'].slice(
        0,
        config.horizontalRows
      ) as RailId[];
      const rowStartX = 200;

      for (let rIdx = 0; rIdx < rowIds.length; rIdx++) {
        const rowY = 165 + rIdx * 245;
        if (svgY >= rowY - 45 && svgY <= rowY + MODULE_HEIGHT + 55) {
          const rawSlot = Math.floor((svgX - rowStartX) / DIN_PITCH);
          const slot = Math.max(0, Math.min(config.modulesPerRow - poles, rawSlot));
          return { railId: rowIds[rIdx], slot, poles };
        }
      }
      return null;
    }
  };

  // Build terminal port coordinate map with explicit exit directions (`up`, `down`, `left`, `right`)
  const portMap = useMemo(() => {
    const map = new Map<string, PortCoordinate>();
    const register = (
      ownerId: string,
      portName: string,
      label: string,
      x: number,
      y: number,
      direction: 'up' | 'down' | 'left' | 'right',
      defaultWireType?: WireType
    ) => {
      const key = `${ownerId}:${portName}`;
      map.set(key, {
        id: key,
        ownerId,
        portName,
        label,
        x,
        y,
        direction,
        defaultWireType,
      });
    };

    const mainBreaker = config.modules.find((m) => m.category === 'main_breaker');
    const topRailStartX = config.topology === 'fishbone' ? 225 : 200;
    const supplyBoxX =
      mainBreaker && (mainBreaker.railId === 'top_main' || mainBreaker.railId === 'row_1')
        ? topRailStartX + mainBreaker.position * DIN_PITCH
        : topRailStartX;
    const supplyBoxY = config.topology === 'fishbone' ? 68 : 108;

    // Register Incoming Utility Supply Ports (Entrada de Energia)
    const numSupplyPhases =
      config.supplyType === 'mono' ? 1 : config.supplyType === 'bi' ? 2 : 3;
    for (let p = 0; p < numSupplyPhases; p++) {
      register(
        'supply_in',
        `phase_${p}`,
        `Entrada Fase ${['R', 'S', 'T'][p]}`,
        supplyBoxX + p * DIN_PITCH + DIN_PITCH / 2,
        supplyBoxY,
        'down'
      );
    }
    register(
      'supply_in',
      'neutral',
      'Entrada Neutro',
      supplyBoxX + numSupplyPhases * DIN_PITCH + 12,
      supplyBoxY,
      'down',
      'neutral'
    );

    if (config.topology === 'fishbone') {
      // Top-left Neutral Bar & Top-right Ground Bar
      for (let i = 0; i < 16; i++) {
        const ny = 114 + i * 11;
        register('neutral_bar', `term_${i}`, `Neutro #${i + 1}`, 136, ny, 'right', 'neutral');
        register('neutral_bar', `duct_${i}`, `Saída N${i + 1}`, 78, ny, 'left', 'neutral');
        register('ground_bar', `term_${i}`, `Terra #${i + 1}`, 864, ny, 'left', 'ground');
        register('ground_bar', `duct_${i}`, `Saída PE${i + 1}`, 922, ny, 'right', 'ground');
      }

      // Top Main DIN rail modules
      const topRailX = 225;
      const topRailY = 122;
      config.modules
        .filter((m) => m.railId === 'top_main')
        .forEach((m) => {
          const mx = topRailX + m.position * DIN_PITCH;
          for (let p = 0; p < m.poles; p++) {
            const px = mx + p * DIN_PITCH + DIN_PITCH / 2;
            register(m.id, `top_${p}`, `${m.name} Topo ${p + 1}`, px, topRailY + 12, 'up');
            register(
              m.id,
              `bottom_${p}`,
              `${m.name} Base ${p + 1}`,
              px,
              topRailY + MODULE_HEIGHT - 12,
              'down'
            );
          }
        });

      // Fishbone Central Copper Busbar feed lugs
      const busTopY = 314;
      const numBars = config.supplyType === 'tri' ? 3 : config.supplyType === 'bi' ? 2 : 1;
      const barSpacing = numBars === 3 ? 30 : numBars === 2 ? 44 : 0;
      const busStartX = 500 - ((numBars - 1) * barSpacing) / 2;
      for (let b = 0; b < numBars; b++) {
        register(
          'fishbone_bus',
          `feed_${b}`,
          `Barramento Fase ${['R', 'S', 'T'][b]}`,
          busStartX + b * barSpacing,
          busTopY,
          'up'
        );
      }

      // Left & Right Vertical Rail Breakers
      const verticalStartY = 360;
      const leftRailOuterX = 266;
      const leftRailInnerX = 382;
      const rightRailInnerX = 618;
      const rightRailOuterX = 734;

      for (let s = 0; s < config.fishboneSlotsPerSide + 2; s++) {
        const py = verticalStartY + s * DIN_PITCH + DIN_PITCH / 2;
        register('left_duct', `slot_${s}`, `Calha Esq #${s + 1}`, 78, py, 'right');
        register(
          'right_duct',
          `slot_right_rail_${s}`,
          `Calha Dir #${s + 1}`,
          922,
          py,
          'left'
        );
        register(
          'right_duct',
          `slot_top_main_${s}`,
          `Calha Sup #${s + 1}`,
          922,
          topRailY + 20 + s * 6,
          'left'
        );
      }

      config.modules
        .filter((m) => m.railId === 'left_rail')
        .forEach((m) => {
          const my = verticalStartY + m.position * DIN_PITCH;
          for (let p = 0; p < m.poles; p++) {
            const py = my + p * DIN_PITCH + DIN_PITCH / 2;
            register(m.id, `in_${p}`, `${m.name} Entrada ${p + 1}`, leftRailInnerX - 10, py, 'right');
            register(m.id, `out_${p}`, `${m.name} Saída ${p + 1}`, leftRailOuterX + 10, py, 'left');
          }
        });

      config.modules
        .filter((m) => m.railId === 'right_rail')
        .forEach((m) => {
          const my = verticalStartY + m.position * DIN_PITCH;
          for (let p = 0; p < m.poles; p++) {
            const py = my + p * DIN_PITCH + DIN_PITCH / 2;
            register(m.id, `in_${p}`, `${m.name} Entrada ${p + 1}`, rightRailInnerX + 10, py, 'left');
            register(m.id, `out_${p}`, `${m.name} Saída ${p + 1}`, rightRailOuterX - 10, py, 'right');
          }
        });
    } else {
      // HORIZONTAL DIN TOPOLOGY
      const railWidth = config.modulesPerRow * DIN_PITCH;
      const barWidth = Math.max(680, railWidth + 40);
      const numTerminals = Math.max(24, Math.floor((barWidth - 40) / 28));
      const termSpacing = (barWidth - 40) / numTerminals;

      for (let i = 0; i < numTerminals; i++) {
        const gx = 190 + i * termSpacing;
        register('ground_bar', `term_${i}`, `Terra #${i + 1}`, gx, 60, 'down', 'ground');
        register('ground_bar', `duct_${i}`, `Saída PE #${i + 1}`, gx, 32, 'up', 'ground');
      }

      const bottomBarY = canvasHeight - 64;
      for (let i = 0; i < numTerminals; i++) {
        const nx = 190 + i * termSpacing;
        register('neutral_bar', `term_${i}`, `Neutro #${i + 1}`, nx, bottomBarY, 'up', 'neutral');
        register('neutral_bar', `duct_${i}`, `Saída N #${i + 1}`, nx, bottomBarY + 30, 'down', 'neutral');
      }

      const rowIds: RailId[] = ['row_1', 'row_2', 'row_3', 'row_4'].slice(
        0,
        config.horizontalRows
      ) as RailId[];
      const rowStartX = 200;
      const numSupplyPhases = config.supplyType === 'tri' ? 3 : config.supplyType === 'bi' ? 2 : 1;

      rowIds.forEach((railId, rIdx) => {
        const rowY = 165 + rIdx * 245;

        if (rIdx > 0) {
          for (let p = 0; p < numSupplyPhases; p++) {
            const cx = rowStartX + (p + 1) * DIN_PITCH + 7 + 14;
            register(
              `comb_${railId}`,
              `feed_${p}`,
              `Conector Barramento ${railId} Fase ${p + 1}`,
              cx,
              rowY - 42,
              'up'
            );
          }
        }

        const ductRightX = canvasWidth - 75;
        for (let s = 0; s < config.modulesPerRow + 2; s++) {
          register(
            'right_duct',
            `slot_${railId}_${s}`,
            `Calha Direita ${railId} #${s + 1}`,
            ductRightX,
            rowY + MODULE_HEIGHT + 18 + (s % 5) * 6,
            'left'
          );
        }

        config.modules
          .filter((m) => m.railId === railId)
          .forEach((m) => {
            const mx = rowStartX + m.position * DIN_PITCH;
            for (let p = 0; p < m.poles; p++) {
              const px = mx + p * DIN_PITCH + DIN_PITCH / 2;
              register(m.id, `top_${p}`, `${m.name} Topo ${p + 1}`, px, rowY + 12, 'up');
              register(
                m.id,
                `bottom_${p}`,
                `${m.name} Base ${p + 1}`,
                px,
                rowY + MODULE_HEIGHT - 12,
                'down'
              );
              register(
                m.id,
                `out_${p}`,
                `${m.name} Saída ${p + 1}`,
                px,
                rowY + MODULE_HEIGHT - 12,
                'down'
              );
            }
          });
      });
    }

    return map;
  }, [config, canvasHeight]);

  // Filter visible wires
  const visibleWires = useMemo(() => {
    if (!config.showWires) return [];
    return config.wires.filter((w) => {
      if (config.wireFilter === 'all') return true;
      if (config.wireFilter === 'phases') return w.wireType.startsWith('phase_');
      if (config.wireFilter === 'neutral') return w.wireType === 'neutral';
      if (config.wireFilter === 'ground') return w.wireType === 'ground';
      return true;
    });
  }, [config.wires, config.showWires, config.wireFilter]);

  /**
   * Find an unobstructed vertical pass-through X coordinate on a horizontal DIN rail
   * so wires connecting a bottom terminal to a top terminal never cross through a module body.
   */
  const findPassThroughX = (railId: RailId, railStartX: number, trackIdx: number): number => {
    const maxSlots = railId === 'top_main' ? 12 : config.modulesPerRow;
    const occupied = new Set<number>();
    config.modules
      .filter((m) => m.railId === railId)
      .forEach((m) => {
        for (let p = 0; p < m.poles; p++) {
          occupied.add(m.position + p);
        }
      });

    // 1. Look for an empty gap between occupied modules
    const occupiedArr = Array.from(occupied);
    if (occupiedArr.length > 0) {
      const minOcc = Math.min(...occupiedArr);
      const maxOcc = Math.max(...occupiedArr);
      for (let s = minOcc + 1; s < maxOcc; s++) {
        if (!occupied.has(s)) {
          return railStartX + s * DIN_PITCH + DIN_PITCH / 2 + (trackIdx % 5 - 2) * 5;
        }
      }
      // 2. If no gap between, check if there is an empty slot to the right of modules
      if (maxOcc + 1 < maxSlots) {
        return railStartX + (maxOcc + 1) * DIN_PITCH + 10 + (trackIdx % 5) * 5;
      }
    }
    // 3. Otherwise route cleanly around the left edge of the rail
    return railStartX - 24 - (trackIdx % 5) * 6.5;
  };

  /**
   * Unified Port-Direction-Aware Orthogonal Channel Wire Router:
   * Works identically for BOTH automatic wires AND user-inserted manual wires!
   * Every wire respects the exit direction of its start and end terminals (`up`, `down`, `left`, `right`)
   * and uses separated parallel tracks inside the wiring channels.
   */
  const buildWirePath = (wire: WireConnection, wireIdx: number): string | null => {
    const p1 = portMap.get(`${wire.fromId}:${wire.fromPort}`);
    const p2 = portMap.get(`${wire.toId}:${wire.toPort}`);
    if (!p1 || !p2) return null;

    // 1. Short terminal bar stubs (Neutral / Ground outgoing stubs)
    if (
      wire.fromId === wire.toId &&
      (wire.fromId === 'neutral_bar' || wire.fromId === 'ground_bar')
    ) {
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }

    // Track index (0..5) to keep parallel wires separated in channels
    const baseTypeIdx =
      wire.wireType === 'phase_r'
        ? 0
        : wire.wireType === 'phase_s'
        ? 1
        : wire.wireType === 'phase_t'
        ? 2
        : wire.wireType === 'neutral'
        ? 3
        : 4;
    const wireDpsShift =
      wire.toId.includes('dps') || wire.fromId.includes('dps') ? 1 : 0;
    const laneIdx =
      (baseTypeIdx * 2 + wireDpsShift + (wire.isAutoGenerated ? 0 : wireIdx)) % 8;

    const topRailY = config.topology === 'fishbone' ? 122 : 165;
    const topRailStartX = config.topology === 'fishbone' ? 225 : 200;
    const topRailId: RailId = config.topology === 'fishbone' ? 'top_main' : 'row_1';

    // 2. Incoming Supply Box (`supply_in`) connections
    if (p1.ownerId === 'supply_in' || p2.ownerId === 'supply_in') {
      const sup = p1.ownerId === 'supply_in' ? p1 : p2;
      const other = p1.ownerId === 'supply_in' ? p2 : p1;
      if (Math.abs(sup.x - other.x) < 4 && other.direction === 'up') {
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
      }
      const upperChannelY = topRailY - 14 - (laneIdx % 4) * 5.5;
      return `M ${sup.x} ${sup.y} L ${sup.x} ${upperChannelY} L ${other.x} ${upperChannelY} L ${other.x} ${other.y}`;
    }

    // 3. Both ports are on the SAME horizontal row (`Math.abs(p1.y - p2.y) <= MODULE_HEIGHT`)
    //    and neither is a side terminal bar
    const isBarPort = (pt: PortCoordinate) =>
      pt.ownerId === 'neutral_bar' ||
      pt.ownerId === 'ground_bar' ||
      pt.ownerId === 'fishbone_bus' ||
      pt.ownerId === 'left_duct' ||
      pt.ownerId === 'right_duct';

    if (!isBarPort(p1) && !isBarPort(p2) && Math.abs(p1.y - p2.y) <= MODULE_HEIGHT + 10) {
      // 3a. Both ports are TOP terminals (`direction === 'up'`) -> route in Upper Channel above the row!
      if (p1.direction === 'up' && p2.direction === 'up') {
        const upperY = Math.min(p1.y, p2.y) - 24 - laneIdx * 6;
        return `M ${p1.x} ${p1.y} L ${p1.x} ${upperY} L ${p2.x} ${upperY} L ${p2.x} ${p2.y}`;
      }

      // 3b. Both ports are BOTTOM terminals (`direction === 'down'`) -> route in Lower Channel below the row!
      if (p1.direction === 'down' && p2.direction === 'down') {
        const lowerY = Math.max(p1.y, p2.y) + 20 + laneIdx * 6;
        return `M ${p1.x} ${p1.y} L ${p1.x} ${lowerY} L ${p2.x} ${lowerY} L ${p2.x} ${p2.y}`;
      }

      // 3c. One port is BOTTOM (`down`) and one port is TOP (`up`) on the same row!
      //     Route from bottom port -> Lower Channel -> Pass-Through Gap -> Upper Channel -> top port!
      if (
        (p1.direction === 'down' && p2.direction === 'up') ||
        (p1.direction === 'up' && p2.direction === 'down')
      ) {
        const downPt = p1.direction === 'down' ? p1 : p2;
        const upPt = p1.direction === 'down' ? p2 : p1;
        const passX = findPassThroughX(topRailId, topRailStartX, laneIdx);
        const lowerY = downPt.y + 18 + laneIdx * 5.5;
        const upperY = upPt.y - 24 - laneIdx * 5.5;
        return `M ${downPt.x} ${downPt.y} L ${downPt.x} ${lowerY} L ${passX} ${lowerY} L ${passX} ${upperY} L ${upPt.x} ${upperY} L ${upPt.x} ${upPt.y}`;
      }
    }

    // 4. FISHBONE TOPOLOGY ROUTING (Works for both Manual and Auto wires!)
    if (config.topology === 'fishbone') {
      // 4a. Connection to Central Fishbone Busbar (`fishbone_bus`)
      if (p1.ownerId === 'fishbone_bus' || p2.ownerId === 'fishbone_bus') {
        const busPt = p1.ownerId === 'fishbone_bus' ? p1 : p2;
        const modPt = p1.ownerId === 'fishbone_bus' ? p2 : p1;

        if (modPt.direction === 'up') {
          // If user connected from a TOP terminal to the fishbone busbar, go up -> passX -> down to busbar
          const passX = findPassThroughX('top_main', topRailStartX, laneIdx);
          const upperY = modPt.y - 26 - laneIdx * 6.5;
          const lowerY = 266 + laneIdx * 7;
          return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${upperY} L ${passX} ${upperY} L ${passX} ${lowerY} L ${busPt.x} ${lowerY} L ${busPt.x} ${busPt.y}`;
        }

        const laneY = 266 + laneIdx * 7;
        return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${laneY} L ${busPt.x} ${laneY} L ${busPt.x} ${busPt.y}`;
      }

      // 4b. Connection to Top-Left Neutral Bar (`neutral_bar`)
      if (p1.ownerId === 'neutral_bar' || p2.ownerId === 'neutral_bar') {
        const barPt = p1.ownerId === 'neutral_bar' ? p1 : p2;
        const modPt = p1.ownerId === 'neutral_bar' ? p2 : p1;
        const termIdx = Number(barPt.portName.split('_')[1] || 0);
        const leftChannelX = 162 + (termIdx % 4) * 5.5;

        if (modPt.direction === 'up') {
          const upperY = modPt.y - 24 - laneIdx * 6;
          return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${upperY} L ${leftChannelX} ${upperY} L ${leftChannelX} ${barPt.y} L ${barPt.x} ${barPt.y}`;
        }
        if (modPt.direction === 'down') {
          const lowerY = 286 + (laneIdx % 3) * 6;
          return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${lowerY} L ${leftChannelX} ${lowerY} L ${leftChannelX} ${barPt.y} L ${barPt.x} ${barPt.y}`;
        }
        // From a left/right horizontal breaker (`left` or `right`)
        return `M ${modPt.x} ${modPt.y} L ${leftChannelX} ${modPt.y} L ${leftChannelX} ${barPt.y} L ${barPt.x} ${barPt.y}`;
      }

      // 4c. Connection to Top-Right Ground Bar (`ground_bar`)
      if (p1.ownerId === 'ground_bar' || p2.ownerId === 'ground_bar') {
        const barPt = p1.ownerId === 'ground_bar' ? p1 : p2;
        const modPt = p1.ownerId === 'ground_bar' ? p2 : p1;
        const termIdx = Number(barPt.portName.split('_')[1] || 0);
        const rightChannelX = 834 - (termIdx % 5) * 6;

        if (modPt.direction === 'up') {
          const upperY = modPt.y - 24 - laneIdx * 6;
          return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${upperY} L ${rightChannelX} ${upperY} L ${rightChannelX} ${barPt.y} L ${barPt.x} ${barPt.y}`;
        }
        if (modPt.direction === 'down') {
          const lowerY = 236 + (termIdx % 5) * 5;
          return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${lowerY} L ${rightChannelX} ${lowerY} L ${rightChannelX} ${barPt.y} L ${barPt.x} ${barPt.y}`;
        }
        return `M ${modPt.x} ${modPt.y} L ${rightChannelX} ${modPt.y} L ${rightChannelX} ${barPt.y} L ${barPt.x} ${barPt.y}`;
      }

      // 4d. Left / Right Horizontal Breaker to Side Cable Ducts
      if (
        p1.ownerId === 'left_duct' ||
        p2.ownerId === 'left_duct' ||
        p1.ownerId === 'right_duct' ||
        p2.ownerId === 'right_duct'
      ) {
        if (Math.abs(p1.y - p2.y) < 4) {
          return `M ${p1.x} ${p1.y} L ${p2.x} ${p1.y}`;
        }
        const midX = p1.x < 500 ? 112 + (wireIdx % 4) * 5 : 888 - (wireIdx % 4) * 5;
        return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
      }
    }

    // 5. HORIZONTAL DIN TOPOLOGY ROUTING (Works for both Manual and Auto wires!)
    if (config.topology === 'horizontal') {
      // 5a. Connection to Top Ground Bar (`ground_bar`)
      if (p1.ownerId === 'ground_bar' || p2.ownerId === 'ground_bar') {
        const barPt = p1.ownerId === 'ground_bar' ? p1 : p2;
        const modPt = p1.ownerId === 'ground_bar' ? p2 : p1;
        const termIdx = Number(barPt.portName.split('_')[1] || 0);

        if (modPt.direction === 'up' && modPt.y < 220) {
          // Direct connection in the channel between Top Ground Bar and Row 1
          const laneY = 82 + (termIdx % 4) * 5.5;
          return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${laneY} L ${barPt.x} ${laneY} L ${barPt.x} ${barPt.y}`;
        }

        // Route via Right Perimeter Trunk around the DIN rows
        const dropY = modPt.y + 22 + (termIdx % 5) * 6;
        const rightBypassX = 200 + config.modulesPerRow * DIN_PITCH + 25 + (termIdx % 5) * 6;
        const topEntryY = 78 + (termIdx % 5) * 5;
        return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${dropY} L ${rightBypassX} ${dropY} L ${rightBypassX} ${topEntryY} L ${barPt.x} ${topEntryY} L ${barPt.x} ${barPt.y}`;
      }

      // 5b. Connection to Bottom Neutral Bar (`neutral_bar`)
      if (p1.ownerId === 'neutral_bar' || p2.ownerId === 'neutral_bar') {
        const barPt = p1.ownerId === 'neutral_bar' ? p1 : p2;
        const modPt = p1.ownerId === 'neutral_bar' ? p2 : p1;
        const termIdx = Number(barPt.portName.split('_')[1] || 0);
        const leftTrunkX = 92 + (termIdx % 4) * 6;
        const exitY =
          modPt.direction === 'up'
            ? modPt.y - 24 - (laneIdx % 3) * 6
            : modPt.y + 36 + (laneIdx % 3) * 6;
        const bottomApproachY = barPt.y - 22 - (termIdx % 4) * 5;
        return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${exitY} L ${leftTrunkX} ${exitY} L ${leftTrunkX} ${bottomApproachY} L ${barPt.x} ${bottomApproachY} L ${barPt.x} ${barPt.y}`;
      }

      // 5c. Outgoing Breaker Load Wires to Right Cable Duct
      if (p1.ownerId === 'right_duct' || p2.ownerId === 'right_duct') {
        const modPt = p1.ownerId === 'right_duct' ? p2 : p1;
        const ductPt = p1.ownerId === 'right_duct' ? p1 : p2;
        const slotIndex = Math.max(0, Math.round((modPt.x - 200) / DIN_PITCH));
        const laneY = modPt.y + 18 + (slotIndex % 8) * 5.5;
        return `M ${modPt.x} ${modPt.y} L ${modPt.x} ${laneY} L ${ductPt.x} ${laneY} L ${ductPt.x} ${ductPt.y}`;
      }

      // 5d. Connections between different Horizontal Rows or Comb Busbars
      const vertDist = Math.abs(p1.y - p2.y);
      if (vertDist > 260) {
        // Skipping an intermediate row -> route via Left Phase Trunk (`x = 104..128`)
        const upperPt = p1.y < p2.y ? p1 : p2;
        const lowerPt = p1.y < p2.y ? p2 : p1;
        const upperExitY =
          upperPt.direction === 'up'
            ? upperPt.y - 24 - laneIdx * 6
            : upperPt.y + 48 + laneIdx * 6.5;
        const leftPhaseTrunkX = 104 + laneIdx * 6.5;
        const lowerEntryY =
          lowerPt.direction === 'up'
            ? lowerPt.y - 16 - laneIdx * 6.5
            : lowerPt.y + 22 + laneIdx * 6.5;
        return `M ${upperPt.x} ${upperPt.y} L ${upperPt.x} ${upperExitY} L ${leftPhaseTrunkX} ${upperExitY} L ${leftPhaseTrunkX} ${lowerEntryY} L ${lowerPt.x} ${lowerEntryY} L ${lowerPt.x} ${lowerPt.y}`;
      } else {
        // Adjacent rows -> route in the horizontal channel between them
        const midChannelY = (p1.y + p2.y) / 2 + (laneIdx - 2) * 6.5;
        return `M ${p1.x} ${p1.y} L ${p1.x} ${midChannelY} L ${p2.x} ${midChannelY} L ${p2.x} ${p2.y}`;
      }
    }

    // 6. General fallback between any other two ports using side channel
    const channelY =
      p1.direction === 'up'
        ? p1.y - 24 - laneIdx * 6
        : p1.y + 24 + laneIdx * 6;
    return `M ${p1.x} ${p1.y} L ${p1.x} ${channelY} L ${p2.x} ${channelY} L ${p2.x} ${p2.y}`;
  };

  // Pointer Drag Handlers
  const handleModulePointerDown = (e: React.PointerEvent, m: PanelModule) => {
    if (wireToolActive) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    setPointerDrag({
      module: m,
      startX: pt.x,
      startY: pt.y,
      currentX: pt.x,
      currentY: pt.y,
      hasMoved: false,
    });
    onSelectModule(m.id);
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    if (!pointerDrag) return;
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    const dist = Math.hypot(pt.x - pointerDrag.startX, pt.y - pointerDrag.startY);
    const hasMoved = pointerDrag.hasMoved || dist > 6;

    setPointerDrag((prev) =>
      prev ? { ...prev, currentX: pt.x, currentY: pt.y, hasMoved } : null
    );

    if (hasMoved) {
      const hit = hitTestRailSlot(pt.x, pt.y, pointerDrag.module.poles);
      setHoveredSlot(hit);
    }
  };

  const handleSvgPointerUp = (e?: React.PointerEvent) => {
    if (!pointerDrag) return;
    if (e) {
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {}
    }
    if (pointerDrag.hasMoved) {
      dragJustEndedRef.current = true;
      setTimeout(() => {
        dragJustEndedRef.current = false;
      }, 150);
      if (hoveredSlot) {
        onMoveModule(pointerDrag.module.id, hoveredSlot.railId, hoveredSlot.slot);
      }
    }
    setPointerDrag(null);
    setHoveredSlot(null);
  };

  const handleSvgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    const draggedPoles = (window as any).__draggedCatalogPoles || 1;
    const hit = hitTestRailSlot(pt.x, pt.y, draggedPoles);
    setHoveredSlot(hit);
  };

  const handleSvgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const catalogKey = e.dataTransfer.getData('text/catalog-item');
    const draggedPoles = (window as any).__draggedCatalogPoles || 1;
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    const hit = hoveredSlot || hitTestRailSlot(pt.x, pt.y, draggedPoles);

    if (catalogKey && hit) {
      onDropCatalogItem(catalogKey, hit.railId, hit.slot);
    }
    setHoveredSlot(null);
    (window as any).__draggedCatalogPoles = 1;
  };

  // Render Incoming Utility Supply Header Box (Entrada de Energia)
  const renderSupplyEntryBox = () => {
    const mainBreaker = config.modules.find((m) => m.category === 'main_breaker');
    const topRailStartX = config.topology === 'fishbone' ? 225 : 200;
    const boxX =
      mainBreaker && (mainBreaker.railId === 'top_main' || mainBreaker.railId === 'row_1')
        ? topRailStartX + mainBreaker.position * DIN_PITCH
        : topRailStartX;
    const boxY = config.topology === 'fishbone' ? 42 : 82;
    const numSupplyPhases =
      config.supplyType === 'mono' ? 1 : config.supplyType === 'bi' ? 2 : 3;
    const boxW = numSupplyPhases * DIN_PITCH + 32;

    return (
      <g>
        <rect
          x={boxX - 4}
          y={boxY}
          width={boxW}
          height={26}
          rx={5}
          fill="#0f172a"
          stroke="#475569"
          strokeWidth={1.5}
        />
        <text
          x={boxX - 4 + boxW / 2}
          y={boxY + 10.5}
          textAnchor="middle"
          fontSize={7}
          fontWeight="bold"
          fill="#94a3b8"
        >
          ENTRADA GERAL
        </text>
        {['R', 'S', 'T'].slice(0, numSupplyPhases).map((ph, idx) => (
          <text
            key={ph}
            x={boxX + idx * DIN_PITCH + DIN_PITCH / 2}
            y={boxY + 21.5}
            textAnchor="middle"
            fontSize={8}
            fontWeight="bold"
            fill={ph === 'R' ? '#f87171' : ph === 'S' ? '#facc15' : '#f8fafc'}
          >
            {ph}
          </text>
        ))}
        <text
          x={boxX + numSupplyPhases * DIN_PITCH + 12}
          y={boxY + 21.5}
          textAnchor="middle"
          fontSize={config.groundingSystem === 'TN-C' || config.groundingSystem === 'TN-C-S' ? 7 : 8}
          fontWeight="bold"
          fill="#38bdf8"
        >
          {config.groundingSystem === 'TN-C' || config.groundingSystem === 'TN-C-S' ? 'PEN' : 'N'}
        </text>

        {/* NBR 5410 Grounding Scheme Badge */}
        <g transform={`translate(${boxX + boxW + 8}, ${boxY})`}>
          <rect
            x={0}
            y={0}
            width={72}
            height={26}
            rx={5}
            fill="#022c22"
            stroke="#059669"
            strokeWidth={1.2}
          />
          <text
            x={36}
            y={10}
            textAnchor="middle"
            fontSize={6.5}
            fontWeight="bold"
            fill="#34d399"
          >
            ATERRAMENTO
          </text>
          <text
            x={36}
            y={21}
            textAnchor="middle"
            fontSize={8.5}
            fontWeight="bold"
            fill="#f8fafc"
          >
            {config.groundingSystem || 'TN-S'}
          </text>
          <title>{`Esquema de Aterramento NBR 5410: ${config.groundingSystem || 'TN-S'}`}</title>
        </g>
      </g>
    );
  };

  // Render Vertical DIN Module (Identical unified DPS for both Phase and Neutral!)
  const renderVerticalModule = (
    m: PanelModule,
    x: number,
    y: number
  ) => {
    const w = m.poles * DIN_PITCH;
    const h = MODULE_HEIGHT;
    const isSelected = selectedModuleId === m.id;
    const isBeingDragged = pointerDrag?.module.id === m.id && pointerDrag.hasMoved;
    const current = calculateCircuitCurrent(m);
    const isOverloaded = m.category === 'breaker' && current > m.ratingAmps;

    return (
      <g
        key={m.id}
        transform={`translate(${x}, ${y})`}
        opacity={isBeingDragged ? 0.45 : 1}
        onPointerDown={(e) => handleModulePointerDown(e, m)}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing select-none"
      >
        {(isSelected || isOverloaded) && (
          <rect
            x={-3}
            y={-3}
            width={w + 6}
            height={h + 6}
            rx={6}
            fill="none"
            stroke={isOverloaded ? '#ef4444' : '#f59e0b'}
            strokeWidth={3}
          />
        )}

        {/* Module Main Casing (Single unified red casing for all DPS modules) */}
        <rect
          x={1}
          y={0}
          width={w - 2}
          height={h}
          rx={4}
          fill={m.category === 'dps' ? '#dc2626' : '#f8fafc'}
          stroke={m.category === 'dps' ? '#991b1b' : '#64748b'}
          strokeWidth={1.5}
        />

        {/* Multi-Pole Internal Divider Lines */}
        {Array.from({ length: m.poles - 1 }).map((_, idx) => (
          <line
            key={idx}
            x1={(idx + 1) * DIN_PITCH}
            y1={4}
            x2={(idx + 1) * DIN_PITCH}
            y2={h - 4}
            stroke={m.category === 'dps' ? '#b91c1c' : '#cbd5e1'}
            strokeWidth={1}
          />
        ))}

        {/* Top & Bottom Terminal Screws */}
        {Array.from({ length: m.poles }).map((_, p) => {
          const cx = p * DIN_PITCH + DIN_PITCH / 2;
          return (
            <g key={p}>
              <circle
                cx={cx}
                cy={12}
                r={6}
                fill={m.category === 'dps' ? '#fca5a5' : '#e2e8f0'}
                stroke="#475569"
                strokeWidth={1.2}
              />
              <line x1={cx - 3.5} y1={12} x2={cx + 3.5} y2={12} stroke="#334155" strokeWidth={1.4} />
              <line x1={cx} y1={8.5} x2={cx} y2={15.5} stroke="#334155" strokeWidth={1.2} />

              <circle
                cx={cx}
                cy={h - 12}
                r={6}
                fill={m.category === 'dps' ? '#fca5a5' : '#e2e8f0'}
                stroke="#475569"
                strokeWidth={1.2}
              />
              <line
                x1={cx - 3.5}
                y1={h - 12}
                x2={cx + 3.5}
                y2={h - 12}
                stroke="#334155"
                strokeWidth={1.4}
              />
              <line
                x1={cx}
                y1={h - 15.5}
                x2={cx}
                y2={h - 8.5}
                stroke="#334155"
                strokeWidth={1.2}
              />
            </g>
          );
        })}

        {/* Module Faceplate Content */}
        {m.category === 'dps' ? (
          // Unified DPS Module (identical for Phase and Neutral)
          <g>
            <rect
              x={5}
              y={24}
              width={w - 10}
              height={46}
              rx={3}
              fill="#ffffff"
              stroke="#991b1b"
              strokeWidth={1}
            />
            <text
              x={w / 2}
              y={35}
              textAnchor="middle"
              fontSize={8.5}
              fontWeight="bold"
              fill="#0f172a"
            >
              DPS
            </text>
            <rect
              x={w / 2 - 8}
              y={39}
              width={16}
              height={9}
              rx={2}
              fill={m.isOn ? '#22c55e' : '#ef4444'}
              stroke="#0f172a"
              strokeWidth={0.8}
            />
            <text
              x={w / 2}
              y={58}
              textAnchor="middle"
              fontSize={7.5}
              fontWeight="bold"
              fill="#334155"
            >
              {m.dpsVoltage || 275}V
            </text>
            <text x={w / 2} y={66} textAnchor="middle" fontSize={7} fill="#64748b">
              {m.dpsKa || 20}kA
            </text>

            <rect x={5} y={75} width={w - 10} height={17} rx={2.5} fill="#0f172a" />
            <text
              x={w / 2}
              y={86.5}
              textAnchor="middle"
              fontSize={7}
              fontWeight="bold"
              fill="#ffffff"
            >
              CLASSE II
            </text>
          </g>
        ) : m.category === 'idr' ? (
          <g>
            <rect
              x={6}
              y={23}
              width={w - 12}
              height={20}
              rx={2.5}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            <text
              x={w / 2}
              y={36}
              textAnchor="middle"
              fontSize={9}
              fontWeight="bold"
              fill="#0f172a"
            >
              IDR {m.ratingAmps}A • {m.sensitivityMa || 30}mA
            </text>

            <rect
              x={w - 30}
              y={49}
              width={20}
              height={16}
              rx={2.5}
              fill="#e2e8f0"
              stroke="#475569"
              strokeWidth={1}
            />
            <text
              x={w - 20}
              y={60}
              textAnchor="middle"
              fontSize={8}
              fontWeight="bold"
              fill="#0f172a"
            >
              T
            </text>

            <g
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleModulePower(m.id);
              }}
              className="cursor-pointer"
            >
              <rect
                x={10}
                y={48}
                width={Math.min(56, w - 46)}
                height={20}
                rx={3}
                fill={m.isOn ? '#1e293b' : '#64748b'}
              />
              <text
                x={10 + Math.min(56, w - 46) / 2}
                y={61}
                textAnchor="middle"
                fontSize={7.5}
                fontWeight="bold"
                fill="#ffffff"
              >
                {m.isOn ? 'ON' : 'OFF'}
              </text>
            </g>

            <rect x={6} y={75} width={w - 12} height={17} rx={2.5} fill="#0f172a" />
            <text
              x={w / 2}
              y={86.5}
              textAnchor="middle"
              fontSize={8}
              fontWeight="bold"
              fill="#38bdf8"
            >
              DR • FASES + N
            </text>
          </g>
        ) : (
          <g>
            <rect
              x={4}
              y={22}
              width={w - 8}
              height={20}
              rx={2.5}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={0.9}
            />
            <text
              x={w / 2}
              y={35}
              textAnchor="middle"
              fontSize={8.5}
              fontWeight="bold"
              fill="#0f172a"
            >
              {m.curve || 'C'}
              {m.ratingAmps} • {m.phases}
            </text>

            <g
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleModulePower(m.id);
              }}
              className="cursor-pointer"
            >
              <rect
                x={5}
                y={46}
                width={w - 10}
                height={24}
                rx={3}
                fill="#e2e8f0"
                stroke="#94a3b8"
                strokeWidth={0.9}
              />
              <rect
                x={6}
                y={m.isOn ? 47 : 57}
                width={w - 12}
                height={12}
                rx={2}
                fill={m.isOn ? '#dc2626' : '#475569'}
              />
              <text
                x={w / 2}
                y={m.isOn ? 55.5 : 65.5}
                textAnchor="middle"
                fontSize={6.5}
                fontWeight="bold"
                fill="#ffffff"
              >
                {m.isOn ? 'ON' : 'OFF'}
              </text>
            </g>

            <rect x={3} y={72} width={w - 6} height={20} rx={2.5} fill="#0f172a" stroke="#334155" strokeWidth={0.8} />
            <title>{m.circuitNumber ? `Circuito ${m.circuitNumber}: ${m.name}` : m.name}</title>
            {m.circuitNumber ? (
              m.poles === 1 ? (
                <g>
                  <text
                    x={w / 2}
                    y={81.5}
                    textAnchor="middle"
                    fontSize={7.5}
                    fontWeight="bold"
                    fill="#38bdf8"
                  >
                    C{m.circuitNumber}
                  </text>
                  <text
                    x={w / 2}
                    y={89.5}
                    textAnchor="middle"
                    fontSize={6}
                    fill="#94a3b8"
                  >
                    {m.name.length > 7 ? m.name.slice(0, 6) + '…' : m.name}
                  </text>
                </g>
              ) : (
                <text
                  x={w / 2}
                  y={85}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight="bold"
                  fill="#f8fafc"
                >
                  {`C${m.circuitNumber} • ${m.name.length > m.poles * 8 ? m.name.slice(0, m.poles * 8 - 1) + '…' : m.name}`}
                </text>
              )
            ) : (
              <text
                x={w / 2}
                y={85}
                textAnchor="middle"
                fontSize={8}
                fontWeight="bold"
                fill="#f8fafc"
              >
                GERAL
              </text>
            )}
          </g>
        )}
      </g>
    );
  };

  // Render Horizontally-Mounted DIN Breaker for Fishbone Left/Right Vertical Rails
  const renderFishboneHorizontalBreaker = (
    m: PanelModule,
    side: 'left' | 'right',
    x: number,
    y: number
  ) => {
    const h = m.poles * DIN_PITCH;
    const w = MODULE_HEIGHT;
    const isSelected = selectedModuleId === m.id;
    const isBeingDragged = pointerDrag?.module.id === m.id && pointerDrag.hasMoved;
    const current = calculateCircuitCurrent(m);
    const isOverloaded = m.category === 'breaker' && current > m.ratingAmps;

    return (
      <g
        key={m.id}
        transform={`translate(${x}, ${y})`}
        opacity={isBeingDragged ? 0.45 : 1}
        onPointerDown={(e) => handleModulePointerDown(e, m)}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing select-none"
      >
        {(isSelected || isOverloaded) && (
          <rect
            x={-3}
            y={-3}
            width={w + 6}
            height={h + 6}
            rx={6}
            fill="none"
            stroke={isOverloaded ? '#ef4444' : '#f59e0b'}
            strokeWidth={3}
          />
        )}

        <rect
          x={0}
          y={1}
          width={w}
          height={h - 2}
          rx={4}
          fill="#f8fafc"
          stroke="#64748b"
          strokeWidth={1.5}
        />

        {Array.from({ length: m.poles - 1 }).map((_, idx) => (
          <line
            key={idx}
            x1={4}
            y1={(idx + 1) * DIN_PITCH}
            x2={w - 4}
            y2={(idx + 1) * DIN_PITCH}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
        ))}

        {Array.from({ length: m.poles }).map((_, p) => {
          const cy = p * DIN_PITCH + DIN_PITCH / 2;
          return (
            <g key={p}>
              <circle cx={12} cy={cy} r={5.5} fill="#e2e8f0" stroke="#475569" strokeWidth={1.2} />
              <line x1={8.5} y1={cy} x2={15.5} y2={cy} stroke="#334155" strokeWidth={1.3} />
              <line x1={12} y1={cy - 3.5} x2={12} y2={cy + 3.5} stroke="#334155" strokeWidth={1.2} />

              <circle
                cx={w - 12}
                cy={cy}
                r={5.5}
                fill="#e2e8f0"
                stroke="#475569"
                strokeWidth={1.2}
              />
              <line
                x1={w - 15.5}
                y1={cy}
                x2={w - 8.5}
                y2={cy}
                stroke="#334155"
                strokeWidth={1.3}
              />
              <line
                x1={w - 12}
                y1={cy - 3.5}
                x2={w - 12}
                y2={cy + 3.5}
                stroke="#334155"
                strokeWidth={1.2}
              />
            </g>
          );
        })}

        {/* Toggle Switch Handle */}
        <g
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleModulePower(m.id);
          }}
          className="cursor-pointer"
        >
          <rect
            x={side === 'left' ? 74 : 22}
            y={6}
            width={20}
            height={h - 12}
            rx={2.5}
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth={0.9}
          />
          <rect
            x={
              side === 'left'
                ? m.isOn
                  ? 83
                  : 75
                : m.isOn
                ? 23
                : 31
            }
            y={7}
            width={10}
            height={h - 14}
            rx={2}
            fill={m.isOn ? '#dc2626' : '#475569'}
          />
        </g>

        {/* Clean Specification Box */}
        <rect
          x={side === 'left' ? 23 : 46}
          y={6}
          width={47}
          height={h - 12}
          rx={3}
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        <text
          x={side === 'left' ? 46.5 : 69.5}
          y={h / 2 - 2}
          textAnchor="middle"
          fontSize={8.5}
          fontWeight="bold"
          fill="#0f172a"
        >
          {m.curve || 'C'}
          {m.ratingAmps}A
        </text>
        <text
          x={side === 'left' ? 46.5 : 69.5}
          y={h / 2 + 9}
          textAnchor="middle"
          fontSize={7.5}
          fontWeight="bold"
          fill="#475569"
        >
          Fase {m.phases}
        </text>

        {/* External High-Contrast Circuit Name Plaque */}
        <g
          transform={
            side === 'left'
              ? `translate(-142, ${h / 2 - 20})`
              : `translate(${w + 8}, ${h / 2 - 20})`
          }
        >
          <rect
            x={0}
            y={0}
            width={134}
            height={16}
            rx={3}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth={1}
          />
          <text
            x={67}
            y={11}
            textAnchor="middle"
            fontSize={8}
            fontWeight="bold"
            fill="#f8fafc"
          >
            <title>{`C${m.circuitNumber || '?'} • ${m.name}`}</title>
            C{m.circuitNumber || '?'} • {m.name.length > 16 ? m.name.slice(0, 15) + '…' : m.name}
          </text>
        </g>
      </g>
    );
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-slate-900 overflow-hidden select-none">
      {/* Top Canvas Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/95 border-b border-slate-800 text-xs z-10">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-200">
            {config.topology === 'fishbone'
              ? 'Espinha de Peixe'
              : 'DIN Horizontal'}
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
            {config.supplyType === 'tri'
              ? 'Trifásico'
              : config.supplyType === 'bi'
              ? 'Bifásico'
              : 'Monofásico'}{' '}
            • {config.voltageSystem === '127_220' ? '127V / 220V' : '220V / 380V'}
          </span>
          {wireToolActive ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse font-medium">
              {wireStartPort
                ? `Conectando de "${wireStartPort.label}" → Clique no borne de destino (ou clique em um fio para removê-lo)`
                : 'Modo Fio Manual: Clique em qualquer borne para iniciar ou clique sobre um fio existente para apagá-lo'}
            </span>
          ) : (
            <span className="text-slate-400 hidden md:inline">
              Arraste qualquer componente com o mouse para mudar de posição
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.65, +(z - 0.1).toFixed(2)))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Diminuir Zoom"
          >
            −
          </button>
          <span className="font-mono text-slate-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Aumentar Zoom"
          >
            +
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            100%
          </button>
        </div>
      </div>

      {/* Scrollable SVG Viewport */}
      <div
        className="flex-1 overflow-auto flex justify-center items-start p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]"
        onClick={() => {
          if (dragJustEndedRef.current) return;
          onSelectModule(null);
          if (wireStartPort) setWireStartPort(null);
        }}
      >
        <svg
          ref={svgRef}
          width={canvasWidth * zoom}
          height={canvasHeight * zoom}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onDragOver={handleSvgDragOver}
          onDragLeave={() => setHoveredSlot(null)}
          onDrop={handleSvgDrop}
          className="shadow-2xl rounded-xl border border-slate-700/80 bg-slate-950 transition-all duration-150"
        >
          <defs>
            <linearGradient id="dinRailGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="25%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="80%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            <linearGradient id="dinRailVertGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            <linearGradient id="copperGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="65%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            <linearGradient id="brassGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ca8a04" />
              <stop offset="50%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
          </defs>

          {/* Outer QDC Enclosure Box */}
          <rect
            x={20}
            y={16}
            width={canvasWidth - 40}
            height={canvasHeight - 32}
            rx={16}
            fill="#cbd5e1"
            stroke="#64748b"
            strokeWidth={4}
          />
          {/* Inner Mounting Plate */}
          <rect
            x={46}
            y={32}
            width={canvasWidth - 92}
            height={canvasHeight - 64}
            rx={10}
            fill="#f1f5f9"
            stroke="#94a3b8"
            strokeWidth={2}
          />

          {/* Render Incoming Utility Supply Header */}
          {renderSupplyEntryBox()}

          {/* ============================================================== */}
          {/* MODEL 1: VERTICAL "ESPINHA DE PEIXE"                           */}
          {/* ============================================================== */}
          {config.topology === 'fishbone' && (
            <g>
              {/* Left & Right Slotted Cable Ducts */}
              <rect
                x={58}
                y={52}
                width={34}
                height={canvasHeight - 104}
                rx={4}
                fill="#94a3b8"
                stroke="#475569"
                strokeWidth={1.5}
              />
              <rect
                x={908}
                y={52}
                width={34}
                height={canvasHeight - 104}
                rx={4}
                fill="#94a3b8"
                stroke="#475569"
                strokeWidth={1.5}
              />
              {Array.from({ length: 30 }).map((_, idx) => (
                <g key={idx}>
                  <line
                    x1={76}
                    y1={68 + idx * 26}
                    x2={92}
                    y2={68 + idx * 26}
                    stroke="#334155"
                    strokeWidth={3}
                  />
                  <line
                    x1={908}
                    y1={68 + idx * 26}
                    x2={924}
                    y2={68 + idx * 26}
                    stroke="#334155"
                    strokeWidth={3}
                  />
                </g>
              ))}

              {/* Top-Left Neutral Terminal Bar */}
              <g>
                <rect
                  x={122}
                  y={92}
                  width={28}
                  height={196}
                  rx={4}
                  fill="#0284c7"
                  stroke="#0369a1"
                  strokeWidth={1.5}
                />
                <rect x={129} y={102} width={14} height={176} rx={2} fill="url(#brassGrad)" />
                <text
                  x={136}
                  y={84}
                  textAnchor="middle"
                  fontSize={config.groundingSystem === 'TN-C' ? 8.5 : 9}
                  fontWeight="bold"
                  fill="#0369a1"
                >
                  {config.groundingSystem === 'TN-C' ? 'PEN' : 'NEUTRO'}
                </text>
                {Array.from({ length: 16 }).map((_, i) => (
                  <circle
                    key={i}
                    cx={136}
                    cy={114 + i * 11}
                    r={3.5}
                    fill="#fef08a"
                    stroke="#713f12"
                    strokeWidth={1}
                  />
                ))}
              </g>

              {/* Top-Right Ground Terminal Bar */}
              <g>
                <rect
                  x={850}
                  y={92}
                  width={28}
                  height={196}
                  rx={4}
                  fill="#16a34a"
                  stroke="#15803d"
                  strokeWidth={1.5}
                />
                <rect x={857} y={102} width={14} height={176} rx={2} fill="url(#brassGrad)" />
                <text
                  x={864}
                  y={84}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight="bold"
                  fill="#15803d"
                >
                  {config.groundingSystem === 'TN-C'
                    ? 'PEN (PE)'
                    : config.groundingSystem === 'TN-C-S'
                    ? 'PE (PEN)'
                    : config.groundingSystem === 'TT'
                    ? 'TERRA TT'
                    : config.groundingSystem === 'IT'
                    ? 'TERRA IT'
                    : 'TERRA'}
                </text>
                {Array.from({ length: 16 }).map((_, i) => (
                  <circle
                    key={i}
                    cx={864}
                    cy={114 + i * 11}
                    r={3.5}
                    fill="#fef08a"
                    stroke="#713f12"
                    strokeWidth={1}
                  />
                ))}
              </g>

              {/* Top Horizontal DIN Rail */}
              <g>
                <rect
                  x={205}
                  y={158}
                  width={12 * DIN_PITCH + 36}
                  height={44}
                  rx={3}
                  fill="url(#dinRailGrad)"
                  stroke="#64748b"
                  strokeWidth={1.5}
                />

                {Array.from({ length: 12 }).map((_, slotIdx) => {
                  const sx = 225 + slotIdx * DIN_PITCH;
                  const isHovered =
                    hoveredSlot?.railId === 'top_main' && hoveredSlot?.slot === slotIdx;
                  return (
                    <rect
                      key={slotIdx}
                      x={sx}
                      y={122}
                      width={DIN_PITCH * (isHovered ? hoveredSlot?.poles || 1 : 1)}
                      height={MODULE_HEIGHT}
                      fill={isHovered ? 'rgba(245, 158, 11, 0.28)' : 'transparent'}
                      stroke={isHovered ? '#f59e0b' : 'rgba(148, 163, 184, 0.25)'}
                      strokeWidth={isHovered ? 2.5 : 1}
                      strokeDasharray={isHovered ? undefined : '3 3'}
                    />
                  );
                })}
              </g>

              {/* Central Copper Fishbone Busbar */}
              {(() => {
                const verticalStartY = 360;
                const totalHeight = config.fishboneSlotsPerSide * DIN_PITCH;
                const numBars =
                  config.supplyType === 'tri' ? 3 : config.supplyType === 'bi' ? 2 : 1;
                const barSpacing = numBars === 3 ? 30 : numBars === 2 ? 44 : 0;
                const busStartX = 500 - ((numBars - 1) * barSpacing) / 2;
                const phasesList =
                  numBars === 3 ? ['R', 'S', 'T'] : numBars === 2 ? ['R', 'S'] : ['R'];

                return (
                  <g>
                    <rect
                      x={415}
                      y={320}
                      width={170}
                      height={totalHeight + 60}
                      rx={6}
                      fill="#e2e8f0"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                    />

                    {[0, Math.floor(config.fishboneSlotsPerSide / 2), config.fishboneSlotsPerSide - 1].map(
                      (slotPos, idx) => (
                        <rect
                          key={idx}
                          x={442}
                          y={verticalStartY + slotPos * DIN_PITCH + 10}
                          width={116}
                          height={20}
                          rx={3}
                          fill="#ea580c"
                          stroke="#9a3412"
                          strokeWidth={1}
                        />
                      )
                    )}

                    {/* Horizontal Copper Fingers */}
                    {Array.from({ length: config.fishboneSlotsPerSide }).map((_, sIdx) => {
                      const fingerY = verticalStartY + sIdx * DIN_PITCH + DIN_PITCH / 2 - 5;
                      const barIdx = sIdx % numBars;
                      const sourceBarX = busStartX + barIdx * barSpacing;
                      const phaseLetter = phasesList[barIdx];

                      return (
                        <g key={sIdx}>
                          <rect
                            x={374}
                            y={fingerY}
                            width={252}
                            height={10}
                            rx={2}
                            fill="url(#copperGrad)"
                            stroke="#78350f"
                            strokeWidth={0.9}
                          />
                          <circle
                            cx={sourceBarX}
                            cy={fingerY + 5}
                            r={4.2}
                            fill="#fef08a"
                            stroke="#713f12"
                            strokeWidth={1.2}
                          />
                          <text
                            x={425}
                            y={fingerY + 8}
                            fontSize={7.5}
                            fontWeight="bold"
                            fill="#78350f"
                          >
                            {phaseLetter}
                          </text>
                          <text
                            x={568}
                            y={fingerY + 8}
                            fontSize={7.5}
                            fontWeight="bold"
                            fill="#78350f"
                          >
                            {phaseLetter}
                          </text>
                        </g>
                      );
                    })}

                    {/* Vertical Main Copper Bars (R, S, T) */}
                    {Array.from({ length: numBars }).map((_, bIdx) => {
                      const bx = busStartX + bIdx * barSpacing - 7;
                      const phaseLabel = phasesList[bIdx];
                      return (
                        <g key={bIdx}>
                          <rect
                            x={bx + 1}
                            y={304}
                            width={12}
                            height={24}
                            rx={3}
                            fill="#cbd5e1"
                            stroke="#475569"
                            strokeWidth={1.2}
                          />
                          <circle cx={bx + 7} cy={314} r={3.5} fill="#334155" />
                          <rect
                            x={bx}
                            y={322}
                            width={14}
                            height={totalHeight + 46}
                            rx={2}
                            fill="url(#copperGrad)"
                            stroke="#78350f"
                            strokeWidth={1.2}
                          />
                          <text
                            x={bx + 7}
                            y={340}
                            textAnchor="middle"
                            fontSize={9}
                            fontWeight="bold"
                            fill="#ffffff"
                          >
                            {phaseLabel}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })()}

              {/* Left & Right Vertical DIN Rails + Slot Guides */}
              {(() => {
                const verticalStartY = 360;
                const totalHeight = config.fishboneSlotsPerSide * DIN_PITCH;
                return (
                  <g>
                    <rect
                      x={302}
                      y={verticalStartY - 12}
                      width={44}
                      height={totalHeight + 24}
                      rx={3}
                      fill="url(#dinRailVertGrad)"
                      stroke="#64748b"
                      strokeWidth={1.5}
                    />
                    <rect
                      x={654}
                      y={verticalStartY - 12}
                      width={44}
                      height={totalHeight + 24}
                      rx={3}
                      fill="url(#dinRailVertGrad)"
                      stroke="#64748b"
                      strokeWidth={1.5}
                    />

                    {Array.from({ length: config.fishboneSlotsPerSide }).map((_, sIdx) => {
                      const sy = verticalStartY + sIdx * DIN_PITCH;
                      const isLeftHovered =
                        hoveredSlot?.railId === 'left_rail' && hoveredSlot?.slot === sIdx;
                      const isRightHovered =
                        hoveredSlot?.railId === 'right_rail' && hoveredSlot?.slot === sIdx;

                      return (
                        <g key={sIdx}>
                          <rect
                            x={266}
                            y={sy}
                            width={MODULE_HEIGHT}
                            height={
                              DIN_PITCH * (isLeftHovered ? hoveredSlot?.poles || 1 : 1)
                            }
                            fill={isLeftHovered ? 'rgba(245, 158, 11, 0.28)' : 'transparent'}
                            stroke={isLeftHovered ? '#f59e0b' : 'rgba(148, 163, 184, 0.3)'}
                            strokeWidth={isLeftHovered ? 2.5 : 1}
                            strokeDasharray={isLeftHovered ? undefined : '3 3'}
                          />
                          <rect
                            x={618}
                            y={sy}
                            width={MODULE_HEIGHT}
                            height={
                              DIN_PITCH * (isRightHovered ? hoveredSlot?.poles || 1 : 1)
                            }
                            fill={isRightHovered ? 'rgba(245, 158, 11, 0.28)' : 'transparent'}
                            stroke={isRightHovered ? '#f59e0b' : 'rgba(148, 163, 184, 0.3)'}
                            strokeWidth={isRightHovered ? 2.5 : 1}
                            strokeDasharray={isRightHovered ? undefined : '3 3'}
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })()}
            </g>
          )}

          {/* ============================================================== */}
          {/* MODEL 2: HORIZONTAL DIN RAILS                                  */}
          {/* ============================================================== */}
          {config.topology === 'horizontal' && (
            <g>
              {/* Left & Right Slotted Cable Ducts */}
              <rect
                x={58}
                y={52}
                width={34}
                height={canvasHeight - 104}
                rx={4}
                fill="#94a3b8"
                stroke="#475569"
                strokeWidth={1.5}
              />
              <rect
                x={canvasWidth - 92}
                y={52}
                width={34}
                height={canvasHeight - 104}
                rx={4}
                fill="#94a3b8"
                stroke="#475569"
                strokeWidth={1.5}
              />
              {Array.from({ length: Math.floor((canvasHeight - 120) / 26) }).map((_, idx) => (
                <g key={idx}>
                  <line
                    x1={76}
                    y1={68 + idx * 26}
                    x2={92}
                    y2={68 + idx * 26}
                    stroke="#334155"
                    strokeWidth={3}
                  />
                  <line
                    x1={canvasWidth - 92}
                    y1={68 + idx * 26}
                    x2={canvasWidth - 76}
                    y2={68 + idx * 26}
                    stroke="#334155"
                    strokeWidth={3}
                  />
                </g>
              ))}

              {/* Top Ground Bar */}
              {(() => {
                const railWidth = config.modulesPerRow * DIN_PITCH;
                const barWidth = Math.max(680, railWidth + 40);
                const numTerminals = Math.max(24, Math.floor((barWidth - 40) / 28));
                const termSpacing = (barWidth - 40) / numTerminals;

                return (
                  <g>
                    <rect
                      x={170}
                      y={46}
                      width={barWidth}
                      height={28}
                      rx={4}
                      fill="#475569"
                      stroke="#334155"
                      strokeWidth={1.5}
                    />
                    <text x={115} y={64} fontSize={8.5} fontWeight="bold" fill="#15803d">
                      {config.groundingSystem === 'TN-C'
                        ? 'PEN'
                        : config.groundingSystem === 'TN-C-S'
                        ? 'TERRA (PEN LINK)'
                        : config.groundingSystem === 'TT'
                        ? 'TERRA LOCAL (TT)'
                        : config.groundingSystem === 'IT'
                        ? 'TERRA (IT)'
                        : 'TERRA (PE)'}
                    </text>
                    <rect
                      x={185}
                      y={52}
                      width={barWidth - 30}
                      height={16}
                      rx={2}
                      fill="url(#brassGrad)"
                      stroke="#713f12"
                      strokeWidth={1}
                    />
                    {Array.from({ length: numTerminals }).map((_, i) => (
                      <circle
                        key={i}
                        cx={190 + i * termSpacing}
                        cy={60}
                        r={4}
                        fill="#e2e8f0"
                        stroke="#334155"
                        strokeWidth={1}
                      />
                    ))}
                  </g>
                );
              })()}

              {/* Bottom Neutral Bar */}
              {(() => {
                const bottomBarY = canvasHeight - 64;
                const railWidth = config.modulesPerRow * DIN_PITCH;
                const barWidth = Math.max(680, railWidth + 40);
                const numTerminals = Math.max(24, Math.floor((barWidth - 40) / 28));
                const termSpacing = (barWidth - 40) / numTerminals;

                return (
                  <g>
                    <rect
                      x={170}
                      y={bottomBarY - 14}
                      width={barWidth}
                      height={28}
                      rx={4}
                      fill="#0369a1"
                      stroke="#075985"
                      strokeWidth={1.5}
                    />
                    <text
                      x={115}
                      y={bottomBarY + 4}
                      fontSize={8.5}
                      fontWeight="bold"
                      fill="#0284c7"
                    >
                      {config.groundingSystem === 'TN-C' ? 'BARRA PEN' : 'NEUTRO (N)'}
                    </text>
                    <rect
                      x={185}
                      y={bottomBarY - 8}
                      width={barWidth - 30}
                      height={16}
                      rx={2}
                      fill="url(#brassGrad)"
                      stroke="#713f12"
                      strokeWidth={1}
                    />
                    {Array.from({ length: numTerminals }).map((_, i) => (
                      <circle
                        key={i}
                        cx={190 + i * termSpacing}
                        cy={bottomBarY}
                        r={4}
                        fill="#e2e8f0"
                        stroke="#334155"
                        strokeWidth={1}
                      />
                    ))}
                  </g>
                );
              })()}

              {/* Horizontal DIN Rows */}
              {(['row_1', 'row_2', 'row_3', 'row_4'] as RailId[])
                .slice(0, config.horizontalRows)
                .map((railId, rIdx) => {
                  const rowY = 165 + rIdx * 245;
                  const rowStartX = 200;
                  const railWidth = config.modulesPerRow * DIN_PITCH;
                  const rowModules = config.modules.filter((m) => m.railId === railId);

                  return (
                    <g key={railId}>
                      <text
                        x={125}
                        y={rowY + 62}
                        fontSize={10}
                        fontWeight="bold"
                        fill="#475569"
                      >
                        TRILHO {rIdx + 1}
                      </text>

                      <rect
                        x={155}
                        y={rowY + 24}
                        width={32}
                        height={68}
                        rx={3}
                        fill="#f8fafc"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                      />
                      <rect
                        x={rowStartX + railWidth + 12}
                        y={rowY + 24}
                        width={32}
                        height={68}
                        rx={3}
                        fill="#f8fafc"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                      />

                      <rect
                        x={180}
                        y={rowY + 36}
                        width={railWidth + 36}
                        height={44}
                        rx={2}
                        fill="url(#dinRailGrad)"
                        stroke="#64748b"
                        strokeWidth={1.5}
                      />

                      {rIdx > 0 && rowModules.length > 0 && (
                        <g>
                          <rect
                            x={rowStartX + 4}
                            y={rowY - 36}
                            width={railWidth - 8}
                            height={12}
                            rx={2}
                            fill="#e2e8f0"
                            stroke="#64748b"
                            strokeWidth={1.2}
                          />
                          <rect
                            x={rowStartX + 8}
                            y={rowY - 32}
                            width={railWidth - 16}
                            height={4}
                            fill="url(#copperGrad)"
                          />
                          {Array.from({
                            length:
                              config.supplyType === 'tri'
                                ? 3
                                : config.supplyType === 'bi'
                                ? 2
                                : 1,
                          }).map((_, cIdx) => {
                            const cx = rowStartX + (cIdx + 1) * DIN_PITCH + 7;
                            return (
                              <g key={cIdx}>
                                <rect
                                  x={cx}
                                  y={rowY - 50}
                                  width={28}
                                  height={16}
                                  rx={3}
                                  fill="#ffffff"
                                  stroke="#64748b"
                                  strokeWidth={1.2}
                                />
                                <circle
                                  cx={cx + 14}
                                  cy={rowY - 42}
                                  r={4}
                                  fill="#cbd5e1"
                                  stroke="#334155"
                                  strokeWidth={1}
                                />
                              </g>
                            );
                          })}
                        </g>
                      )}

                      {Array.from({ length: config.modulesPerRow }).map((_, sIdx) => {
                        const sx = rowStartX + sIdx * DIN_PITCH;
                        const isHovered =
                          hoveredSlot?.railId === railId && hoveredSlot?.slot === sIdx;
                        return (
                          <g key={sIdx}>
                            <rect
                              x={sx}
                              y={rowY}
                              width={
                                DIN_PITCH * (isHovered ? hoveredSlot?.poles || 1 : 1)
                              }
                              height={MODULE_HEIGHT}
                              fill={isHovered ? 'rgba(245, 158, 11, 0.28)' : 'transparent'}
                              stroke={isHovered ? '#f59e0b' : 'rgba(148, 163, 184, 0.28)'}
                              strokeWidth={isHovered ? 2.5 : 1}
                              strokeDasharray={isHovered ? undefined : '3 3'}
                            />
                            <text
                              x={sx + DIN_PITCH / 2}
                              y={rowY + MODULE_HEIGHT + 13}
                              textAnchor="middle"
                              fontSize={7.5}
                              fill="#94a3b8"
                            >
                              {sIdx + 1}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
            </g>
          )}

          {/* ============================================================== */}
          {/* NON-OVERLAPPING WIRE ROUTING LAYER (MANUAL & AUTO)             */}
          {/* ============================================================== */}
          <g>
            {visibleWires.map((w, idx) => {
              const path = buildWirePath(w, idx);
              if (!path) return null;
              const strokeColor =
                w.customColor || getWireColorHex(w.wireType, config.phaseColorScheme);
              const strokeWidth = w.gaugeMm2 >= 10 ? 4.2 : w.gaugeMm2 >= 6 ? 3.6 : 3;
              const isHovered = hoveredWireId === w.id;

              return (
                <g
                  key={w.id}
                  onMouseEnter={() => setHoveredWireId(w.id)}
                  onMouseLeave={() => setHoveredWireId(null)}
                  onClick={(e) => {
                    if (wireToolActive) {
                      e.stopPropagation();
                      onDeleteWire(w.id);
                    }
                  }}
                  className={wireToolActive ? 'cursor-pointer' : 'pointer-events-none'}
                >
                  {wireToolActive && (
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  <path
                    d={path}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={strokeWidth + 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                  />
                  <path
                    d={path}
                    fill="none"
                    stroke={isHovered && wireToolActive ? '#f43f5e' : strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>

          {/* ============================================================== */}
          {/* MODULES LAYER                                                  */}
          {/* ============================================================== */}
          {config.topology === 'fishbone' ? (
            <g>
              {config.modules
                .filter((m) => m.railId === 'top_main')
                .map((m) => renderVerticalModule(m, 225 + m.position * DIN_PITCH, 122))}
              {config.modules
                .filter((m) => m.railId === 'left_rail')
                .map((m) =>
                  renderFishboneHorizontalBreaker(
                    m,
                    'left',
                    266,
                    360 + m.position * DIN_PITCH
                  )
                )}
              {config.modules
                .filter((m) => m.railId === 'right_rail')
                .map((m) =>
                  renderFishboneHorizontalBreaker(
                    m,
                    'right',
                    618,
                    360 + m.position * DIN_PITCH
                  )
                )}
            </g>
          ) : (
            <g>
              {(['row_1', 'row_2', 'row_3', 'row_4'] as RailId[])
                .slice(0, config.horizontalRows)
                .map((railId, rIdx) => {
                  const rowY = 165 + rIdx * 245;
                  const rowStartX = 200;
                  return config.modules
                    .filter((m) => m.railId === railId)
                    .map((m) =>
                      renderVerticalModule(
                        m,
                        rowStartX + m.position * DIN_PITCH,
                        rowY
                      )
                    );
                })}
            </g>
          )}

          {/* Floating Ghost Preview while dragging */}
          {pointerDrag && pointerDrag.hasMoved && (
            <g
              transform={`translate(${pointerDrag.currentX - 24}, ${
                pointerDrag.currentY - 24
              })`}
              className="pointer-events-none"
              opacity={0.85}
            >
              <rect
                x={0}
                y={0}
                width={pointerDrag.module.poles * DIN_PITCH}
                height={56}
                rx={6}
                fill="#f59e0b"
                stroke="#0f172a"
                strokeWidth={2}
              />
              <text
                x={(pointerDrag.module.poles * DIN_PITCH) / 2}
                y={26}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill="#0f172a"
              >
                {pointerDrag.module.name.slice(0, 14)}
              </text>
              <text
                x={(pointerDrag.module.poles * DIN_PITCH) / 2}
                y={40}
                textAnchor="middle"
                fontSize={8}
                fontWeight="bold"
                fill="#1e293b"
              >
                {hoveredSlot
                  ? `Soltar na Posição ${hoveredSlot.slot + 1}`
                  : 'Arraste para um trilho'}
              </text>
            </g>
          )}

          {/* Interactive Terminal Ports Overlay when Manual Wire Tool is Active */}
          {wireToolActive && (
            <g>
              {Array.from(portMap.values()).map((port) => {
                const isStart = wireStartPort?.id === port.id;
                return (
                  <g
                    key={port.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!wireStartPort) {
                        setWireStartPort(port);
                      } else if (wireStartPort.id === port.id) {
                        setWireStartPort(null);
                      } else {
                        onAddWire(
                          wireStartPort.ownerId,
                          wireStartPort.portName,
                          port.ownerId,
                          port.portName
                        );
                        setWireStartPort(null);
                      }
                    }}
                    className="cursor-crosshair"
                  >
                    <circle
                      cx={port.x}
                      cy={port.y}
                      r={isStart ? 8 : 5.5}
                      fill={
                        isStart
                          ? '#f59e0b'
                          : getWireColorHex(activeWireType, config.phaseColorScheme)
                      }
                      stroke="#0f172a"
                      strokeWidth={1.8}
                    >
                      <title>{port.label}</title>
                    </circle>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

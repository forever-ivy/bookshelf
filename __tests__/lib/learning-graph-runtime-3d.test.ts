import {
  resolveLearningGraph3DLabelVisibility,
  resolveLearningGraph3DNodeVisualState,
} from '@/lib/learning/graph-runtime-3d';

describe('learning graph runtime 3d helpers', () => {
  it('shows labels for selected-neighborhood nodes', () => {
    expect(
      resolveLearningGraph3DLabelVisibility(
        {
          id: 'concept:limits',
          label: '极限',
          type: 'Concept',
        },
        {
          generatedNodeIds: [],
          guideStatusByNodeId: {},
          highlightedNodeIds: [],
          mode: 'global',
          selectedNeighborhoodNodeIds: new Set(['concept:limits']),
          selectedNodeId: null,
        }
      )
    ).toBe(true);
  });

  it('shows labels for guide-highlighted nodes', () => {
    expect(
      resolveLearningGraph3DLabelVisibility(
        {
          id: 'concept:derivative',
          label: '导数',
          type: 'Concept',
        },
        {
          generatedNodeIds: [],
          guideStatusByNodeId: {
            'concept:derivative': 'current',
          },
          highlightedNodeIds: [],
          mode: 'guide',
          selectedNeighborhoodNodeIds: null,
          selectedNodeId: null,
        }
      )
    ).toBe(true);
  });

  it('hides most fragment labels when they are not selected or highlighted', () => {
    expect(
      resolveLearningGraph3DLabelVisibility(
        {
          id: 'fragment:1',
          label: '函数极限的定义',
          type: 'Fragment',
        },
        {
          generatedNodeIds: [],
          guideStatusByNodeId: {},
          highlightedNodeIds: [],
          mode: 'global',
          selectedNeighborhoodNodeIds: null,
          selectedNodeId: null,
        }
      )
    ).toBe(false);
  });

  it('marks generated explore nodes with explore emphasis', () => {
    expect(
      resolveLearningGraph3DNodeVisualState(
        {
          id: 'explore:concept:无穷小',
          label: '无穷小',
          type: 'Concept',
        },
        {
          generatedNodeIds: ['explore:concept:无穷小'],
          guideStatusByNodeId: {},
          highlightedNodeIds: ['explore:concept:无穷小'],
          mode: 'explore',
          selectedNeighborhoodNodeIds: null,
          selectedNodeId: null,
          theme: {
            background: '#fff',
            borderSoft: '#ddd',
            edge: '#999',
            explore: '#f90',
            fragment: '#aaa',
            primary: '#333',
            source: '#090',
            step: '#cc0',
            success: '#060',
            surface: '#fff',
            text: '#111',
            textSoft: '#666',
            warning: '#cc0',
          },
        }
      )
    ).toEqual(
      expect.objectContaining({
        color: '#f90',
        emphasis: 'generated',
        opacity: 0.98,
      })
    );
  });
});

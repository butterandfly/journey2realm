import { convertJourneyFile } from '../src/extract-content';
import * as fs from 'fs';
jest.mock('fs');

describe('convertJourneyFile', () => {
  beforeEach(() => {
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => '');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should convert a journey file correctly', () => {
    // Mock journey canvas data
    const journeyCanvasData = {
      nodes: [
        {
          id: "d8625dca8e47b64d",
          type: "text",
          text: "#journey Simple Journey ^00000000-0000-0000-0000-000000000001\n\nA simple journey description.",
          x: 0,
          y: 0,
          width: 400,
          height: 100
        },
        {
          id: "f3c1becd8c3e5417",
          type: "file",
          file: "test/Quest 1.canvas",
          x: -200,
          y: 100,
          width: 400,
          height: 400
        },
        {
          id: "01a6fa6965a64ef7",
          type: "file",
          file: "test/Quest 2.canvas",
          x: 200,
          y: 100,
          width: 400,
          height: 400
        }
      ],
      edges: [
        {
          id: "c2c3d6eff1354065",
          fromNode: "d8625dca8e47b64d",
          fromSide: "bottom",
          toNode: "f3c1becd8c3e5417",
          toSide: "top"
        },
        {
          id: "404c1dfe96ebe614",
          fromNode: "d8625dca8e47b64d",
          fromSide: "bottom",
          toNode: "01a6fa6965a64ef7",
          toSide: "top"
        }
      ]
    };

    // Mock quest canvas data
    const questCanvasData = {
      nodes: [
        {
          id: "c766bdde23abc883",
          type: "text",
          text: "#quest Simple Quest ^00000000-0000-0000-0000-000000000002\nA simple quest description",
          x: 0,
          y: 0,
          width: 400,
          height: 100
        }
      ],
      edges: []
    };

    // Setup fs mock
    fs.readFileSync
        // @ts-ignore
      .mockReturnValueOnce(JSON.stringify(journeyCanvasData))
      .mockReturnValue(JSON.stringify(questCanvasData));

    const result = convertJourneyFile('test/Journey.canvas');

    expect(result).toEqual({
      journey: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Simple Journey',
        desc: 'A simple journey description.',
        questSummaries: expect.arrayContaining([
          expect.objectContaining({
            questId: '00000000-0000-0000-0000-000000000002',
            name: 'Simple Quest',
            desc: 'A simple quest description',
            dependencies: expect.any(Array),
            children: expect.any(Array)
          })
        ])
      },
      quests: expect.arrayContaining([
        expect.objectContaining({
          id: '00000000-0000-0000-0000-000000000002',
          name: 'Simple Quest',
          sections: expect.any(Array)
        })
      ])
    });
  });

  it('should throw error when journey id is missing', () => {
    const invalidJourneyData = {
      nodes: [
        {
          id: "d8625dca8e47b64d",
          type: "text",
          text: "#journey Simple Journey\nMissing ID journey",
          x: 0,
          y: 0,
          width: 400,
          height: 100
        }
      ],
      edges: []
    };

    // @ts-ignore
    fs.readFileSync.mockReturnValue(JSON.stringify(invalidJourneyData));

    expect(() => {
      convertJourneyFile('test/Journey.canvas');
    }).toThrow('Journey id is required');
  });

}); 
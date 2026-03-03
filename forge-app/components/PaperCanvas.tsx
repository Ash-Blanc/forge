"use client";

import React, { useState } from "react";
import { Tldraw, Editor, createShapeId } from "tldraw";
import "tldraw/tldraw.css";

interface PaperCanvasProps {
    data: any;
}

export function PaperCanvas({ data }: PaperCanvasProps) {
    const handleMount = (editor: Editor) => {
        if (!data) return;

        editor.updateInstanceState({ isReadonly: true });

        const rootId = createShapeId("root");
        const shapes: any[] = [];
        let yOffset = 0;

        // Root Node (Main Paper/Session)
        shapes.push({
            id: rootId,
            type: "geo",
            x: 400,
            y: yOffset,
            props: {
                w: 300,
                h: 100,
                geo: "rectangle",
                text: "Research Analysis",
                color: "blue",
                fill: "solid",
            },
        });

        yOffset += 200;
        let xOffset = 100;

        const processSection = (sectionName: string, sectionData: any, parentId: string) => {
            if (!sectionData) return;

            const sectionId = createShapeId(`section-${sectionName}`);
            
            // Create Section Node
            shapes.push({
                id: sectionId,
                type: "geo",
                x: xOffset,
                y: yOffset,
                props: {
                    w: 250,
                    h: 80,
                    geo: "rectangle",
                    text: sectionName.toUpperCase(),
                    color: "orange",
                    fill: "solid",
                    size: "s"
                }
            });

            // Create Arrow from Parent to Section
            shapes.push({
                id: createShapeId(),
                type: "arrow",
                props: {
                    start: { type: "binding", isExact: false, boundShapeId: parentId },
                    end: { type: "binding", isExact: false, boundShapeId: sectionId }
                }
            });

            let itemY = yOffset + 150;
            let itemX = xOffset;

            // Handle Key-Value Pairs or Arrays
            if (Array.isArray(sectionData)) {
                sectionData.forEach((item, index) => {
                    const itemId = createShapeId();
                    shapes.push({
                        id: itemId,
                        type: "geo",
                        x: itemX,
                        y: itemY,
                        props: {
                            w: 220,
                            h: 100,
                            geo: "rectangle",
                            text: typeof item === "object" ? JSON.stringify(item, null, 2) : String(item),
                            color: "light-blue",
                            size: "s"
                        }
                    });
                    shapes.push({
                        id: createShapeId(),
                        type: "arrow",
                        props: {
                            start: { type: "binding", isExact: false, boundShapeId: sectionId },
                            end: { type: "binding", isExact: false, boundShapeId: itemId }
                        }
                    });
                    itemY += 120;
                });
            } else if (typeof sectionData === "object") {
                Object.entries(sectionData).forEach(([key, val]) => {
                    if (typeof val === "object" && val !== null) {
                        // For nested objects/arrays inside section, we could recurse, but keep it simple for now
                        const itemId = createShapeId();
                        shapes.push({
                            id: itemId,
                            type: "geo",
                            x: itemX,
                            y: itemY,
                            props: {
                                w: 250,
                                h: 100,
                                geo: "rectangle",
                                text: `${key}:
${Array.isArray(val) ? val.join(", ") : JSON.stringify(val)}`,
                                color: "light-blue",
                                size: "s"
                            }
                        });
                        shapes.push({
                            id: createShapeId(),
                            type: "arrow",
                            props: {
                                start: { type: "binding", isExact: false, boundShapeId: sectionId },
                                end: { type: "binding", isExact: false, boundShapeId: itemId }
                            }
                        });
                        itemY += 120;
                    } else {
                        const itemId = createShapeId();
                        shapes.push({
                            id: itemId,
                            type: "geo",
                            x: itemX,
                            y: itemY,
                            props: {
                                w: 250,
                                h: 100,
                                geo: "rectangle",
                                text: `${key}:
${val}`,
                                color: "light-green",
                                size: "s"
                            }
                        });
                        shapes.push({
                            id: createShapeId(),
                            type: "arrow",
                            props: {
                                start: { type: "binding", isExact: false, boundShapeId: sectionId },
                                end: { type: "binding", isExact: false, boundShapeId: itemId }
                            }
                        });
                        itemY += 120;
                    }
                });
            }

            xOffset += 300;
        };

        if (data.paperAnalysis) processSection("Paper Analysis", data.paperAnalysis, rootId);
        if (data.opportunities) processSection("Opportunities", data.opportunities, rootId);
        if (data.strategy) processSection("Strategy", data.strategy, rootId);

        // Fallback for simple data
        if (!data.paperAnalysis && !data.opportunities && !data.strategy && typeof data === "object") {
             Object.entries(data).forEach(([key, val]) => {
                 processSection(key, val, rootId);
             });
        }

        editor.createShapes(shapes);
        editor.zoomToFit();
    };

    return (
        <div style={{ width: "100%", height: "600px", borderRadius: "8px", overflow: "hidden", border: "1px solid #eadfc9" }}>
            <Tldraw onMount={handleMount} />
        </div>
    );
}

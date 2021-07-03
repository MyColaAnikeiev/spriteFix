/* All canvas renderings is here */
namespace RTools{

    const background_frame_color : string = "#111";
    const background_color : string = "#444";

    const minCanvasWidth: number = 320;
    const minCanvasHeight : number = 160;
    const canvasPadding = 10;

    let ctx: CanvasRenderingContext2D; 
    let canvas: HTMLCanvasElement;
    let preview_ctx: CanvasRenderingContext2D;
    let preview_canvas: HTMLCanvasElement;

    let width : number = 0;
    let height : number = 0;
    let spriteImg : HTMLImageElement;

    /* Setters */
    export function setCanvas(el): void{
        canvas = el;
    }
    export function setContext(context): void{
        ctx = context;
    }
    export function setPreviewCanvas(el): void{
        preview_canvas = el;
    }
    export function setPreviewContext(ctx){
        preview_ctx = ctx;
    }
    export function setImg(img : HTMLImageElement): void{
        spriteImg = img;
        width = spriteImg.width;
        height = spriteImg.height;
    }



    export function drawMarkup(
        width: number,
        height: number
    ):void
    {
        if(width < minCanvasWidth || height < minCanvasHeight){
            width = minCanvasWidth;
            height = minCanvasHeight;
        }

        /* Background frame*/
        ctx.fillStyle = background_frame_color;
        ctx.fillRect(0,0,width,height);
        ctx.fillStyle = background_color;
        ctx.fillRect(canvasPadding,canvasPadding,width - canvasPadding*2, height - canvasPadding*2);
    }

    export function drawImage(): void{

        canvas.setAttribute('width', String(width + canvasPadding * 2));
        canvas.setAttribute('height',String(height + canvasPadding * 2));

        ctx.fillStyle = background_frame_color;
        ctx.fillRect(0,0,width + canvasPadding*2 ,height + canvasPadding*2);

        ctx.drawImage(spriteImg,0,0,width,height,
            canvasPadding,canvasPadding,width,height);
    }


    function drawFrameBox(x,y,width,height): void{
        ctx.strokeStyle = "#a0ffa0";
        ctx.lineWidth = 2;

        ctx.moveTo(x - 2, y - 2);
        ctx.lineTo(x + width + 2, y - 2);
        ctx.lineTo(x + width + 2, y + height + 2);
        ctx.lineTo(x  - 2, y + height + 2);
        ctx.lineTo(x - 2, y - 2);
        ctx.stroke();
    }

    export function drawFrameBoxes(frames: Frames): void{
        drawImage();

        let base = frames.baseBox;
        let deltas = frames.frameDeltas;

        /* Draw first */
        drawFrameBox(
            base.left  + canvasPadding, 
            base.top + canvasPadding,
            base.width,
            base.height 
        );
        

        let xShift = base.left + canvasPadding;
        let yShift = base.top  + canvasPadding;

        for(let i = 0; i < deltas.length; i++){
            let d = deltas[i];
            xShift += d.xShift;
            yShift += d.yShift;

            drawFrameBox(
                xShift + d.crop.left,
                yShift + d.crop.top,
                base.width - (d.crop.left + d.crop.right),
                base.height - (d.crop.top + d.crop.bottom)
            );
        }

    }


    /* Show frame by index in preview canvas. */
    /* Base box image sample will be resized to fit in preview canvas as a whole.*/
    export function showFrame(frames: Frames, ind: number){
        let pWidth = preview_canvas.width;
        let pHeight = preview_canvas.height;
        let pRatio = pWidth / pHeight;

        let {crop} = frames.frameDeltas[ind];
        let fWidth = frames.baseBox.width
        let fHeight = frames.baseBox.height;
        // Apply crop
        fWidth  -= crop.left + crop.right;
        fHeight -= crop.top  + crop.bottom;
        let fRatio = fWidth / fHeight;

        /* Fill background */
        preview_ctx.fillStyle = background_color;
        preview_ctx.fillRect(0,0,pWidth,pHeight);

        let position = getFrameAbsolutePosition(frames, ind);
        let bb = frames.baseBox;
        if(pRatio > fRatio){
            let wRatio = fRatio / pRatio;
            let gap = (1 - wRatio) / 2 * pWidth;

            preview_ctx.drawImage(spriteImg,
                position.left + crop.right,
                position.top  + crop.top,
                fWidth, fHeight,
                gap, 0, pWidth*wRatio, pHeight
                );
        }
        else{
            let hRatio = pRatio / fRatio;
            let gap = (1 - hRatio) / 2 * pHeight;

            preview_ctx.drawImage(spriteImg,
                position.left + crop.right, 
                position.top  + crop.top, 
                fWidth, fHeight,
                0, gap, pWidth, pHeight* hRatio
                );
        }
        
    }
    
    function getFrameAbsolutePosition(frames: Frames, ind: number){
        let x = frames.baseBox.left;
        let y = frames.baseBox.top;

        for(let i = 0; i <= ind; i++){
            x += frames.frameDeltas[i].xShift;
            y += frames.frameDeltas[i].yShift;
        }

        return { left: x, top: y }
    }

}
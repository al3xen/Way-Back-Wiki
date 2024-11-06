'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Heatmap } from '@/components/Heatmap';
import { ArticleContent } from '@/components/ArticleContent';
import { useRevisions, useArticleContent } from '@/hooks/useWikipediaData';

const SnapshotPage = () => {
  const params = useParams();
  const slug = params?.slug as string;
  const revisionId = params?.revisionId as string;
  const title = decodeURIComponent(slug.replace(/_/g, ' '));
  
  const { revisions, isLoading: isRevisionsLoading, hasMore, loadMore } = useRevisions(title);
  const { content, isLoading: isContentLoading } = useArticleContent(revisionId, title);

  // Transform revisions data into heatmap format with unique keys
  const heatmapData = useMemo(() => {
    const countMap: { 
      [key: string]: { 
        count: number; 
        revisions: Array<{ 
          id: string;
          timestamp: string 
        }> 
      } 
    } = {};
    
    revisions.forEach(revision => {
      const date = new Date(revision.timestamp).toISOString().split('T')[0];
      if (!countMap[date]) {
        countMap[date] = { count: 0, revisions: [] };
      }
      countMap[date].count += 1;
      countMap[date].revisions.push({ 
        id: revision.id.toString(),
        timestamp: revision.timestamp 
      });
    });

    return Object.entries(countMap).map(([date, data]) => ({
      date,
      count: data.count,
      revisions: data.revisions,
    }));
  }, [revisions]);

  // Calculate the maximum count
  const maxCount = useMemo(() => {
    return Math.max(...heatmapData.map(d => d.count), 1); // Add 1 as fallback for empty data
  }, [heatmapData]);

  // Add intersection observer for infinite scrolling
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isRevisionsLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.disconnect();
      }
    };
  }, [hasMore, isRevisionsLoading, loadMore]);

  if (isContentLoading) {
    return <div>Loading article content...</div>;
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Article Snapshot: {title}</h1>
        <div className="mb-8">
          <Heatmap 
            data={heatmapData}
            maxCount={maxCount}
            onDayClick={(day) => {
              console.log('Day clicked:', day);
              // Add logic to handle day click, e.g., fetching revisions for that day
            }}
          />
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <ArticleContent html={content} className="prose max-w-none" />
        </div>
      </div>
      <div 
        ref={observerTarget} 
        className="h-10 flex items-center justify-center"
      >
        {isRevisionsLoading && <div>Loading more revisions...</div>}
      </div>
    </>
  );
};

export default SnapshotPage; 